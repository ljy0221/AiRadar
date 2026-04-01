package com.mcp.airadar.spark;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.apache.spark.ml.recommendation.ALS;
import org.apache.spark.ml.recommendation.ALSModel;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.SparkSession;
import org.apache.spark.sql.functions;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Statement;
import java.util.Properties;

import static com.mcp.airadar.spark.utils.SparkUtils.getArg;

/**
 * 협업 필터링 기반 개인화 추천 배치 Job
 *
 * Kafka + Delta Lake 대신 PostgreSQL search_logs를 직접 읽어 ALS 학습.
 * 결과는 user_recommendations 테이블에 Overwrite 저장.
 *
 * 실행 방법:
 *   ./gradlew runSparkJob -Pjob=UserRecommendationBatchJob --date 2026-03-18
 *
 * 환경변수:
 *   POSTGRES_JDBC_URL  : jdbc:postgresql://host:5432/airadar
 *   POSTGRES_USER      : DB 사용자명
 *   POSTGRES_PASSWORD  : DB 비밀번호
 *
 * 규칙 (spark-jpa.md):
 *   - Spark → PostgreSQL은 JDBC 직접 사용 (JPA EntityManager 호출 금지)
 */
public class UserRecommendationBatchJob {

    private static final Logger log = LogManager.getLogger(UserRecommendationBatchJob.class);

    // ALS 하이퍼파라미터
    private static final int    ALS_MAX_ITER   = 10;
    private static final double ALS_REG_PARAM  = 0.01;
    private static final int    ALS_RANK       = 10;
    private static final int    TOP_N          = 20;  // 유저별 추천 기사 수

    // 이벤트 타입별 암묵적 평점 (implicit feedback)
    private static final double RATING_BOOKMARKED = 5.0;
    private static final double RATING_LIKED      = 3.0;
    private static final double RATING_VIEWED     = 1.0;

    public static void main(String[] args) throws Exception {
        String date = getArg(args, "--date");
        if (date == null) throw new IllegalArgumentException("필수 인자 누락: --date");

        String jdbcUrl  = System.getenv("POSTGRES_JDBC_URL");
        String pgUser   = System.getenv("POSTGRES_USER");
        String pgPass   = System.getenv("POSTGRES_PASSWORD");

        if (jdbcUrl == null || pgUser == null || pgPass == null) {
            throw new IllegalStateException("필수 환경변수 누락: POSTGRES_JDBC_URL, POSTGRES_USER, POSTGRES_PASSWORD");
        }

        SparkSession spark = SparkSession.builder()
                .appName("UserRecommendationBatchJob-" + date)
                .master(System.getenv().getOrDefault("SPARK_MASTER", "local[*]"))
                .config("spark.ui.enabled", "false")
                .config("spark.serializer", "org.apache.spark.serializer.KryoSerializer")
                .config("spark.sql.autoBroadcastJoinThreshold", "-1")
                .getOrCreate();

        spark.sparkContext().setLogLevel("WARN");

        Properties jdbcProps = new Properties();
        jdbcProps.setProperty("user", pgUser);
        jdbcProps.setProperty("password", pgPass);
        jdbcProps.setProperty("driver", "org.postgresql.Driver");

        try {
            run(spark, jdbcUrl, jdbcProps, date);
        } finally {
            spark.stop();
        }
    }

    static void run(SparkSession spark, String jdbcUrl, Properties jdbcProps, String date) throws Exception {
        log.info("[RecBatch] 시작: date={}", date);

        // ── 1. search_logs 읽기 (최근 30일, 로그인 이벤트만) ─────────────────
        String query = String.format("""
            (SELECT user_id, article_id, event_type
             FROM search_logs
             WHERE occurred_at >= '%s'::date - INTERVAL '30 days'
               AND user_id IS NOT NULL
               AND article_id IS NOT NULL
               AND event_type IN ('ARTICLE_LIKED', 'ARTICLE_BOOKMARKED', 'ARTICLE_VIEWED')
            ) AS events
            """, date);

        Dataset<Row> events = spark.read()
                .format("jdbc")
                .option("url", jdbcUrl)
                .option("dbtable", query)
                .options(toMap(jdbcProps))
                .load();

        long eventCount = events.count();
        log.info("[RecBatch] 이벤트 수: {}", eventCount);

        if (eventCount < 100) {
            log.warn("[RecBatch] 이벤트 부족 ({}) — 학습 skip", eventCount);
            return;
        }

        // ── 2. 이벤트 타입 → 암묵적 평점 변환 ────────────────────────────────
        Dataset<Row> rated = events.withColumn("rating",
                functions.when(
                        functions.col("event_type").equalTo("ARTICLE_BOOKMARKED"), RATING_BOOKMARKED)
                .when(functions.col("event_type").equalTo("ARTICLE_LIKED"), RATING_LIKED)
                .otherwise(RATING_VIEWED))
                .groupBy("user_id", "article_id")
                .agg(functions.sum("rating").alias("rating"));

        // ── 3. String ID → Integer 인덱싱 (ALS 요구사항) ─────────────────────
        Dataset<Row> userIndex = spark.createDataFrame(
                rated.select("user_id").distinct().toJavaRDD().zipWithIndex()
                        .map(t -> new org.apache.spark.sql.catalyst.expressions.GenericRow(
                                new Object[]{t._1().getString(0), t._2().intValue()})),
                new org.apache.spark.sql.types.StructType()
                        .add("user_id", "string")
                        .add("user_idx", "integer")
        );

        Dataset<Row> articleIndex = spark.createDataFrame(
                rated.select("article_id").distinct().toJavaRDD().zipWithIndex()
                        .map(t -> new org.apache.spark.sql.catalyst.expressions.GenericRow(
                                new Object[]{t._1().getString(0), t._2().intValue()})),
                new org.apache.spark.sql.types.StructType()
                        .add("article_id", "string")
                        .add("item_idx", "integer")
        );

        Dataset<Row> indexed = rated
                .join(userIndex, "user_id")
                .join(articleIndex, "article_id")
                .select(
                        functions.col("user_idx"),
                        functions.col("item_idx"),
                        functions.col("rating").cast("float")
                );

        // ── 4. ALS 학습 ────────────────────────────────────────────────────────
        ALS als = new ALS()
                .setMaxIter(ALS_MAX_ITER)
                .setRegParam(ALS_REG_PARAM)
                .setRank(ALS_RANK)
                .setUserCol("user_idx")
                .setItemCol("item_idx")
                .setRatingCol("rating")
                .setImplicitPrefs(true)       // 암묵적 피드백 모드
                .setColdStartStrategy("drop"); // NaN 추천 제거

        ALSModel model = als.fit(indexed);

        // ── 5. 유저별 Top N 추천 ────────────────────────────────────────────────
        Dataset<Row> recommendations = model.recommendForAllUsers(TOP_N)
                .join(userIndex, "user_idx")
                .select(
                        functions.col("user_id"),
                        functions.explode(functions.col("recommendations")).alias("rec")
                )
                .select(
                        functions.col("user_id"),
                        functions.col("rec.item_idx"),
                        functions.col("rec.rating").alias("score")
                )
                .join(articleIndex, "item_idx")
                .select(
                        functions.col("user_id"),
                        functions.col("article_id"),
                        functions.col("score"),
                        functions.lit("COLLABORATIVE").alias("reason"),
                        functions.current_timestamp().alias("generated_at"),
                        functions.expr("current_timestamp + INTERVAL 1 DAY").alias("expires_at")
                );

        long recCount = recommendations.count();
        log.info("[RecBatch] 추천 결과: {}건", recCount);

        // ── 6. user_recommendations 저장 (기존 결과 교체) ─────────────────────
        // Overwrite 전 기존 만료 데이터 정리
        cleanupExpired(jdbcUrl, jdbcProps);

        recommendations.write()
                .format("jdbc")
                .option("url", jdbcUrl)
                .option("dbtable", "user_recommendations")
                .options(toMap(jdbcProps))
                .mode(org.apache.spark.sql.SaveMode.Overwrite)
                .save();

        log.info("[RecBatch] 완료: date={}, 추천 {}건 저장", date, recCount);
    }

    /** 만료된 추천 결과 삭제 */
    private static void cleanupExpired(String jdbcUrl, Properties jdbcProps) {
        try (Connection conn = DriverManager.getConnection(jdbcUrl, jdbcProps);
             Statement stmt = conn.createStatement()) {
            int deleted = stmt.executeUpdate("DELETE FROM user_recommendations WHERE expires_at < NOW()");
            log.info("[RecBatch] 만료 추천 {}건 삭제", deleted);
        } catch (Exception e) {
            log.warn("[RecBatch] 만료 데이터 정리 실패 (무시): {}", e.getMessage());
        }
    }

    private static java.util.Map<String, String> toMap(Properties props) {
        java.util.Map<String, String> map = new java.util.HashMap<>();
        props.forEach((k, v) -> map.put(k.toString(), v.toString()));
        return map;
    }
}
