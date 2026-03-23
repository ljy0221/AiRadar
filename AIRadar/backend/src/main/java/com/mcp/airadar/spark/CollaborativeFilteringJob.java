package com.mcp.airadar.spark;

import org.apache.spark.ml.recommendation.ALS;
import org.apache.spark.ml.recommendation.ALSModel;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.RowFactory;
import org.apache.spark.sql.SaveMode;
import org.apache.spark.sql.SparkSession;
import org.apache.spark.sql.functions;
import org.apache.spark.sql.types.DataTypes;
import org.apache.spark.sql.types.StructType;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.Properties;

import static com.mcp.airadar.spark.utils.SparkUtils.getArg;

/**
 * Collaborative Filtering (ALS) 배치 추천 Job
 *
 * search_logs 테이블에서 최근 30일치 사용자 행동 로그를 읽어
 * ALS 모델을 학습하고, user_recommendations 테이블에 Top-20 추천을 Upsert한다.
 *
 * 이벤트 가중치:
 *   ARTICLE_VIEWED    → 1.0
 *   ARTICLE_SEARCHED  → 2.0 (article_id 가 있는 경우만)
 *   ARTICLE_LIKED     → 3.0
 *   ARTICLE_BOOKMARKED → 5.0
 *
 * 최소 데이터 조건:
 *   - 로그인 사용자 5명 미만 또는 기사 10개 미만이면 SKIP
 *
 * 실행 방법:
 *   ./gradlew runSparkJob -Pjob=CollaborativeFilteringJob -Pdate=2026-03-20
 *
 * 환경변수:
 *   POSTGRES_JDBC_URL  : jdbc:postgresql://host:5432/airadar
 *   POSTGRES_USER      : DB 사용자명
 *   POSTGRES_PASSWORD  : DB 비밀번호
 *
 * 규칙 (spark-jpa.md):
 *   - Spark → PostgreSQL은 JDBC 직접 사용 (JPA EntityManager 호출 금지)
 */
public class CollaborativeFilteringJob {

    private static final int MIN_USERS    = 5;
    private static final int MIN_ITEMS    = 10;
    private static final int TOP_N        = 20;
    private static final int LOOKBACK_DAYS = 30;

    public static void main(String[] args) throws Exception {
        String date = getArg(args, "--date");
        if (date == null) throw new IllegalArgumentException("필수 인자 누락: --date");

        String jdbcUrl  = System.getenv("POSTGRES_JDBC_URL");
        String dbUser   = System.getenv("POSTGRES_USER");
        String password = System.getenv("POSTGRES_PASSWORD");

        if (jdbcUrl == null || dbUser == null || password == null) {
            throw new IllegalStateException(
                "환경변수 누락: POSTGRES_JDBC_URL, POSTGRES_USER, POSTGRES_PASSWORD"
            );
        }

        SparkSession spark = SparkSession.builder()
            .appName("CollaborativeFilteringJob-" + date)
            .master(System.getenv().getOrDefault("SPARK_MASTER", "local[*]"))
            .config("spark.ui.enabled", "false")
            .config("spark.serializer", "org.apache.spark.serializer.KryoSerializer")
            .config("spark.sql.autoBroadcastJoinThreshold", "-1")
            .getOrCreate();

        spark.sparkContext().setLogLevel("WARN");

        try {
            runALS(spark, date, jdbcUrl, dbUser, password);
        } finally {
            spark.stop();
        }
    }

    // -------------------------------------------------------------------------
    // ALS 학습 및 추천 생성
    // -------------------------------------------------------------------------

    private static void runALS(SparkSession spark, String date,
                                String jdbcUrl, String dbUser, String password) throws SQLException {

        Properties jdbcProps = new Properties();
        jdbcProps.setProperty("user", dbUser);
        jdbcProps.setProperty("password", password);
        jdbcProps.setProperty("driver", "org.postgresql.Driver");

        // 1. search_logs에서 최근 LOOKBACK_DAYS일치 로그인 사용자 이벤트 조회
        String query = String.format("""
            (SELECT user_id, article_id, event_type
             FROM search_logs
             WHERE user_id IS NOT NULL
               AND article_id IS NOT NULL
               AND occurred_at >= '%s'::date - INTERVAL '%d days'
               AND occurred_at <= '%s'::date + INTERVAL '1 day'
            ) AS logs
            """, date, LOOKBACK_DAYS, date);

        Dataset<Row> logs = spark.read()
            .jdbc(jdbcUrl, query, jdbcProps);

        long userCount = logs.select("user_id").distinct().count();
        long itemCount = logs.select("article_id").distinct().count();

        System.out.printf("[ALS] 로그 데이터: 사용자 %d명, 기사 %d개%n", userCount, itemCount);

        if (userCount < MIN_USERS || itemCount < MIN_ITEMS) {
            System.out.printf("[ALS] 데이터 부족 (사용자 최소 %d명, 기사 최소 %d개) → SKIP%n",
                MIN_USERS, MIN_ITEMS);
            return;
        }

        // 2. 이벤트 타입별 가중치 부여
        Dataset<Row> ratings = logs
            .withColumn("rating", functions.when(
                    functions.col("event_type").equalTo("ARTICLE_BOOKMARKED"), functions.lit(5.0f))
                .when(functions.col("event_type").equalTo("ARTICLE_LIKED"), functions.lit(3.0f))
                .when(functions.col("event_type").equalTo("ARTICLE_SEARCHED"), functions.lit(2.0f))
                .otherwise(functions.lit(1.0f))  // ARTICLE_VIEWED
            )
            // 같은 (user, article) 중복 시 가중치 합산 (implicit feedback)
            .groupBy("user_id", "article_id")
            .agg(functions.sum("rating").cast(DataTypes.FloatType).alias("rating"));

        // 3. zipWithIndex로 UUID/String → 정수 인덱스 매핑
        StructType userSchema = new StructType()
            .add("user_id", DataTypes.StringType)
            .add("user_index", DataTypes.IntegerType);

        Dataset<Row> userIndexed = spark.createDataFrame(
            ratings.select("user_id").distinct().javaRDD()
                .zipWithIndex()
                .map(t -> RowFactory.create(t._1.getString(0), t._2.intValue())),
            userSchema
        );

        StructType articleSchema = new StructType()
            .add("article_id", DataTypes.StringType)
            .add("article_index", DataTypes.IntegerType);

        Dataset<Row> articleIndexed = spark.createDataFrame(
            ratings.select("article_id").distinct().javaRDD()
                .zipWithIndex()
                .map(t -> RowFactory.create(t._1.getString(0), t._2.intValue())),
            articleSchema
        );

        Dataset<Row> ratingIndexed = ratings
            .join(userIndexed, "user_id")
            .join(articleIndexed, "article_id")
            .select("user_index", "article_index", "rating");

        // 4. ALS 학습
        ALS als = new ALS()
            .setMaxIter(10)
            .setRank(10)
            .setRegParam(0.1)
            .setImplicitPrefs(true)
            .setUserCol("user_index")
            .setItemCol("article_index")
            .setRatingCol("rating")
            .setColdStartStrategy("drop");

        ALSModel model = als.fit(ratingIndexed);

        // 5. 모든 사용자에 대해 Top-N 추천 생성
        Dataset<Row> rawRecs = model.recommendForAllUsers(TOP_N);

        // 6. 역인덱스 변환 (정수 → 실제 ID)
        Dataset<Row> recommendations = rawRecs
            .select(
                functions.col("user_index"),
                functions.explode(functions.col("recommendations")).alias("rec")
            )
            .select(
                functions.col("user_index"),
                functions.col("rec.article_index").alias("article_index"),
                functions.col("rec.rating").alias("als_score")
            )
            .join(userIndexed, "user_index")
            .join(articleIndexed, "article_index")
            .select(
                functions.col("user_id"),
                functions.col("article_id"),
                functions.col("als_score").cast(DataTypes.createDecimalType(8, 6)).alias("score")
            );

        long recCount = recommendations.count();
        System.out.printf("[ALS] 추천 생성: %d건%n", recCount);

        if (recCount == 0) {
            System.out.println("[ALS] 추천 결과 없음 → SKIP");
            return;
        }

        // 7. 만료 데이터 정리 후 Staging 경유 Upsert
        cleanupExpired(jdbcUrl, dbUser, password);
        writeToStaging(recommendations, jdbcUrl, dbUser, password);
        upsertFromStaging(jdbcUrl, dbUser, password);

        System.out.println("[ALS] user_recommendations Upsert 완료");
    }

    // -------------------------------------------------------------------------
    // Staging 쓰기 및 Upsert
    // -------------------------------------------------------------------------

    private static void cleanupExpired(String jdbcUrl, String dbUser, String password) {
        try (Connection conn = DriverManager.getConnection(jdbcUrl, dbUser, password);
             Statement stmt = conn.createStatement()) {
            int deleted = stmt.executeUpdate("DELETE FROM user_recommendations WHERE expires_at < NOW()");
            System.out.printf("[ALS] 만료 추천 %d건 삭제%n", deleted);
        } catch (Exception e) {
            System.err.println("[ALS] 만료 데이터 정리 실패 (무시): " + e.getMessage());
        }
    }

    private static void writeToStaging(Dataset<Row> df,
                                        String jdbcUrl, String dbUser, String password) {
        Properties props = new Properties();
        props.setProperty("user", dbUser);
        props.setProperty("password", password);
        props.setProperty("driver", "org.postgresql.Driver");

        // reason 컬럼 추가
        Dataset<Row> forWrite = df.withColumn("reason", functions.lit("ALS"))
            .withColumn("generated_at", functions.current_timestamp())
            .withColumn("expires_at",
                functions.expr("current_timestamp + INTERVAL '3 days'"));

        forWrite.write()
            .mode(SaveMode.Overwrite)
            .jdbc(jdbcUrl, "user_recommendations_staging", props);
    }

    private static void upsertFromStaging(String jdbcUrl, String dbUser, String password)
            throws SQLException {
        try (Connection conn = DriverManager.getConnection(jdbcUrl, dbUser, password);
             Statement stmt = conn.createStatement()) {
            conn.setAutoCommit(false);
            stmt.execute("""
                DELETE FROM user_recommendations
                WHERE user_id IN (SELECT DISTINCT user_id FROM user_recommendations_staging)
                """);
            stmt.execute("""
                INSERT INTO user_recommendations
                    (user_id, article_id, score, reason, generated_at, expires_at)
                SELECT user_id, article_id, score, reason, generated_at, expires_at
                FROM user_recommendations_staging
                """);
            stmt.execute("TRUNCATE TABLE user_recommendations_staging");
            conn.commit();
        }
    }
}
