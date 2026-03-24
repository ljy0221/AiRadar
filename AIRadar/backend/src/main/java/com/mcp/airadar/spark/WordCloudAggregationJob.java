package com.mcp.airadar.spark;

import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.SparkSession;
import org.apache.spark.sql.functions;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Arrays;
import java.util.List;

import static com.mcp.airadar.spark.utils.SparkUtils.configureS3A;
import static com.mcp.airadar.spark.utils.SparkUtils.getArg;

public class WordCloudAggregationJob {

    private static final List<String> STOPWORDS = Arrays.asList(
            "a", "an", "and", "are", "as", "at", "be", "but", "by",
            "for", "if", "in", "into", "is", "it",
            "no", "not", "of", "on", "or", "such",
            "that", "the", "their", "then", "there", "these",
            "they", "this", "to", "was", "will", "with"
    );

    public static void main(String[] args) throws Exception {
        String weekStartStr = getArg(args, "--week-start");
        if (weekStartStr == null) {
            System.err.println("Usage: --week-start YYYY-MM-DD");
            System.exit(1);
        }

        SparkSession.Builder builder = SparkSession.builder()
                .appName("WordCloudAggregationJob-" + weekStartStr)
                .master(System.getenv().getOrDefault("SPARK_MASTER", "local[*]"))
                .config("spark.ui.enabled", "false")
                .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension")
                .config("spark.sql.catalog.spark_catalog", "org.apache.spark.sql.delta.catalog.DeltaCatalog");
        configureS3A(builder);
        SparkSession spark = builder.getOrCreate();
        spark.sparkContext().setLogLevel("WARN");

        try {
            processAggregation(spark, weekStartStr);
        } finally {
            spark.stop();
        }
    }

    private static Connection getPostgresConnection() throws Exception {
        String url = System.getenv().getOrDefault("POSTGRES_JDBC_URL", "jdbc:postgresql://localhost:15432/airadar");
        String user = System.getenv().getOrDefault("POSTGRES_USER", "airadar");
        String password = System.getenv().getOrDefault("POSTGRES_PASSWORD", "airadar_secret");
        return DriverManager.getConnection(url, user, password);
    }

    private static void processAggregation(SparkSession spark, String weekStartStr) throws Exception {
        String silverBasePath = System.getenv().getOrDefault("SILVER_BASE_PATH", "/tmp/silver");
        System.out.println("☁️ 주간 워드클라우드 집계 시작 (Spark): 주 시작일=" + weekStartStr);

        LocalDate weekStartDate = LocalDate.parse(weekStartStr, DateTimeFormatter.ISO_LOCAL_DATE);
        LocalDate weekEndDate = weekStartDate.plusDays(6);
        String weekEndStr = weekEndDate.format(DateTimeFormatter.ISO_LOCAL_DATE);

        String dateCondition = "batch_date >= '" + weekStartStr + "' AND batch_date <= '" + weekEndStr + "'";

        try (Connection conn = getPostgresConnection()) {
            conn.setAutoCommit(false);

            // 1. NEWS 집계
            try {
                Dataset<Row> newsDf = spark.read().format("delta").load(silverBasePath + "/news").where(dateCondition);
                aggregateAndUpsert(newsDf, "keywords", "NEWS", weekStartDate, conn);
            } catch (Exception e) {
                System.err.println("News Data Not Found: " + e.getMessage());
            }

            // 2. PAPER 집계
            try {
                Dataset<Row> paperDf = spark.read().format("delta").load(silverBasePath + "/paper").where(dateCondition);
                aggregateAndUpsert(paperDf, "keywords", "PAPER", weekStartDate, conn);
            } catch (Exception e) {
                System.err.println("Paper Data Not Found: " + e.getMessage());
            }

            // 3. GITHUB 집계
            try {
                Dataset<Row> githubDf = spark.read().format("delta").load(silverBasePath + "/github").where(dateCondition);
                // GITHUB는 topics 배열 사용
                aggregateAndUpsert(githubDf, "topics", "GITHUB", weekStartDate, conn);
            } catch (Exception e) {
                System.err.println("Github Data Not Found: " + e.getMessage());
            }

            conn.commit();
        }

        System.out.println("✅ 주간 워드클라우드 집계 완료: " + weekStartStr);
    }

    private static void aggregateAndUpsert(Dataset<Row> df, String arrayColName, String sourceType, LocalDate weekStart, Connection conn) throws Exception {
        System.out.println("  📊 [" + sourceType + "] 데이터 집계 중...");

        Dataset<Row> exploded = df.select(functions.explode(functions.col(arrayColName)).alias("keyword"));
        
        // 불용어 및 빈 문자열 소문자 처리 후 필터링
        exploded = exploded.withColumn("keyword", functions.lower(functions.trim(functions.col("keyword"))))
                .filter(functions.col("keyword").isNotNull())
                .filter(functions.length(functions.col("keyword")).gt(1));

        // Stopwords 필터 로직: 로컬 리스트를 broadcast 형태로 하거나 조건절 조립
        String stopWordsCond = String.join(", ", STOPWORDS.stream().map(w -> "'" + w + "'").toArray(String[]::new));
        exploded = exploded.filter("keyword NOT IN (" + stopWordsCond + ")");

        Dataset<Row> counted = exploded.groupBy("keyword").count().orderBy(functions.col("count").desc()).limit(100);

        List<Row> results = counted.collectAsList();
        System.out.println("     -> 상위 " + results.size() + "개 키워드 감지");

        upsertBatch(conn, results, sourceType, weekStart);
    }

    private static void upsertBatch(Connection conn, List<Row> results, String sourceType, LocalDate statDate) throws Exception {
        String sql = "INSERT INTO tech_keyword_daily (keyword, stat_date, source_type, mention_count, created_at) " +
                     "VALUES (?, ?, ?, ?, NOW()) " +
                     "ON CONFLICT (keyword, stat_date, source_type) DO UPDATE SET " +
                     "mention_count = EXCLUDED.mention_count, updated_at = NOW()";

        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            for (Row row : results) {
                String keyword = row.getAs("keyword");
                long count = row.getAs("count");

                ps.setString(1, keyword);
                ps.setDate(2, java.sql.Date.valueOf(statDate));
                ps.setString(3, sourceType);
                ps.setLong(4, count);
                ps.addBatch();
            }
            ps.executeBatch();
        }
    }
}
