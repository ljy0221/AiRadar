package com.mcp.airader.spark;

import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.RowFactory;
import org.apache.spark.sql.SaveMode;
import org.apache.spark.sql.SparkSession;
import org.apache.spark.sql.types.DataTypes;
import org.apache.spark.sql.types.StructField;
import org.apache.spark.sql.types.StructType;

import java.sql.Date;
import java.util.ArrayList;
import java.util.List;

import static com.mcp.airader.spark.utils.SparkUtils.bronzePath;
import static com.mcp.airader.spark.utils.SparkUtils.getArg;
import static com.mcp.airader.spark.utils.SparkUtils.safeGet;
import static com.mcp.airader.spark.utils.SparkUtils.safeGetArray;
import static com.mcp.airader.spark.utils.SparkUtils.safeInt;
import static com.mcp.airader.spark.utils.SparkUtils.safeLong;

import static com.mcp.airader.spark.models.SilverSchemas.*;

/**
 * Bronze → Silver 정제 Job
 *
 * 실행 방법:
 *   ./gradlew runSparkJob -Pjob=SilverRefinementJob --date 2025-03-05 --source-type news
 *
 * 환경변수:
 *   BRONZE_BASE_PATH  : Bronze Delta Lake 루트 경로
 *   SILVER_BASE_PATH  : Silver Delta Lake 루트 경로
 *   AI_SERVER_URL     : AI 분석 서버 URL (현재 Mock 처리)
 *   AI_SERVER_CONCURRENCY : AI 서버 최대 동시 요청 수 (기본 10)
 *
 * 규칙:
 *   - Bronze는 절대 수정하지 않는다 (ReadOnly)
 *   - AI 서버 호출 실패 시 error_log에 기록하고 skip (파이프라인 중단 금지)
 *   - 같은 --date로 재실행 시 Silver Overwrite → 멱등성 보장
 */
public class SilverRefinementJob {

    public static void main(String[] args) {
        String date = getArg(args, "--date");
        String sourceType = getArg(args, "--source-type");

        if (date == null || sourceType == null) {
            throw new IllegalArgumentException("필수 인자 누락: --date, --source-type");
        }

        SparkSession spark = SparkSession.builder()
            .appName("SilverRefinementJob-" + sourceType + "-" + date)
            .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension")
            .config("spark.sql.catalog.spark_catalog",
                    "org.apache.spark.sql.delta.catalog.DeltaCatalog")
            // S3A (MinIO) 설정 — ⚠️ 기본값은 로컬 개발 전용, Staging 이상은 환경변수로만 주입
            .config("spark.hadoop.fs.s3a.impl",
                    "org.apache.hadoop.fs.s3a.S3AFileSystem")
            .config("spark.hadoop.fs.s3a.endpoint",
                    System.getenv().getOrDefault("MINIO_ENDPOINT", "http://localhost:9000"))
            .config("spark.hadoop.fs.s3a.access.key",
                    System.getenv().getOrDefault("AWS_ACCESS_KEY_ID", "minioadmin"))
            .config("spark.hadoop.fs.s3a.secret.key",
                    System.getenv().getOrDefault("AWS_SECRET_ACCESS_KEY", "minioadmin123"))
            .config("spark.hadoop.fs.s3a.path.style.access", "true")
            .config("spark.hadoop.fs.s3a.connection.ssl.enabled", "false")
            .config("spark.hadoop.fs.s3a.aws.credentials.provider",
                    "org.apache.hadoop.fs.s3a.SimpleAWSCredentialsProvider")
            .config("spark.hadoop.fs.s3a.fast.upload", "true")
            .config("spark.hadoop.fs.s3a.multipart.size", "104857600")
            .getOrCreate();

        spark.sparkContext().setLogLevel("WARN");

        try {
            processBronzeToSilver(spark, date, sourceType);
        } finally {
            spark.stop();
        }
    }

    private static void processBronzeToSilver(SparkSession spark, String date, String sourceType) {
        String bronzePath = bronzePath(sourceType, date);
        String silverPath = System.getenv().getOrDefault("SILVER_BASE_PATH", "/tmp/silver")
            + "/" + sourceType;

        System.out.println("[Silver] 처리 시작: source=" + sourceType + ", date=" + date);
        System.out.println("[Silver] Bronze 경로: " + bronzePath);

        Dataset<Row> bronze = spark.read()
            .format("delta")
            .load(bronzePath);

        // Skew 방지: AI 서버 동시 처리 가능 수에 맞춰 파티션 균등 분산
        int aiConcurrency = Integer.parseInt(
            System.getenv().getOrDefault("AI_SERVER_CONCURRENCY", "10")
        );
        Dataset<Row> repartitioned = bronze.repartition(aiConcurrency);

        Dataset<Row> silver = analyzePartitions(spark, repartitioned, sourceType, date);

        // count와 write 양쪽에서 재계산하지 않도록 cache
        silver.cache();
        long count = silver.count();

        // Overwrite로 멱등성 보장 — Delta 트랜잭션으로 원자적 커밋
        silver.write()
            .format("delta")
            .mode(SaveMode.Overwrite)
            .option("replaceWhere", "batch_date = '" + date + "'")
            .partitionBy("batch_date")
            .save(silverPath);

        silver.unpersist();
        System.out.println("[Silver] 완료: " + count + "건 → " + silverPath);
    }

    private static Dataset<Row> analyzePartitions(
            SparkSession spark, Dataset<Row> bronze, String sourceType, String date) {

        StructType schema = switch (sourceType) {
            case "news"   -> NEWS_SILVER_SCHEMA;
            case "paper"  -> PAPER_SILVER_SCHEMA;
            case "github" -> GITHUB_SILVER_SCHEMA;
            default -> throw new IllegalArgumentException("알 수 없는 source-type: " + sourceType);
        };

        Date batchDate = Date.valueOf(date);

        return spark.createDataFrame(
            bronze.javaRDD().mapPartitions(rows -> {
                List<Row> result = new ArrayList<>();
                while (rows.hasNext()) {
                    Row row = rows.next();
                    try {
                        Row analyzed = switch (sourceType) {
                            case "news"   -> mockAnalyzeNews(row, batchDate);
                            case "paper"  -> mockAnalyzePaper(row, batchDate);
                            case "github" -> cleanGithub(row, batchDate);
                            default -> null;
                        };
                        if (analyzed != null) result.add(analyzed);
                    } catch (Exception e) {
                        // AI 호출 실패 시 error_log에 기록하고 skip — 파이프라인 중단 금지
                        result.add(buildErrorRow(row, sourceType, batchDate, e.getMessage()));
                    }
                }
                return result.iterator();
            }),
            schema
        );
    }

    // -------------------------------------------------------------------------
    // Mock 분석 함수 (TODO: 실제 AI 서버 HTTP 호출로 교체)
    // 교체 시 AiClient.java 작성 후 아래 메서드만 대체
    // -------------------------------------------------------------------------

    private static Row mockAnalyzeNews(Row row, Date batchDate) {
        String articleId = safeGet(row, "article_id");
        return RowFactory.create(
            articleId,
            safeGet(row, "title"),
            safeGet(row, "content"),
            safeGet(row, "url"),
            safeGet(row, "source"),
            safeGet(row, "published_at"),
            "NEUTRAL",                          // sentiment (mock)
            new String[]{"AI", "technology"},   // keywords (mock)
            0.5,                                // score (mock)
            "Mock summary for: " + articleId,  // summary (mock)
            "ETC",                              // category (mock)
            "GLOBAL",                           // region (mock)
            null,                               // error_log
            batchDate
        );
    }

    private static Row mockAnalyzePaper(Row row, Date batchDate) {
        String paperId = safeGet(row, "paper_id");
        return RowFactory.create(
            paperId,
            safeGet(row, "title"),
            safeGet(row, "abstract"),
            safeGet(row, "url"),
            safeGet(row, "source"),
            safeGetArray(row, "authors"),
            safeGet(row, "published_at"),
            new String[]{"machine learning"},   // keywords (mock)
            "Mock summary for paper: " + paperId,
            "ETC",                              // category (mock)
            "cs.AI",                            // research_area (mock)
            null,                               // error_log
            batchDate
        );
    }

    private static Row cleanGithub(Row row, Date batchDate) {
        // GitHub 데이터는 AI 분석 없이 정제만 수행
        String repoId = safeGet(row, "repo_id");
        boolean aiRelevance = detectAiRelevance(
            safeGet(row, "description"),
            safeGetArray(row, "topics")
        );
        return RowFactory.create(
            repoId,
            safeGet(row, "repo_name"),
            safeGet(row, "description"),
            safeGet(row, "language"),
            safeGetArray(row, "topics"),
            safeLong(row, "stars"),
            safeLong(row, "forks"),
            safeInt(row, "open_issues"),
            safeInt(row, "weekly_commits"),
            safeInt(row, "star_delta_7d"),
            aiRelevance,
            aiRelevance ? new String[]{"AI", "ML"} : new String[]{},
            null,       // error_log
            batchDate
        );
    }

    /** description/topics에 AI 관련 키워드가 있으면 true */
    private static boolean detectAiRelevance(String description, String[] topics) {
        String text = ((description != null ? description : "") + " "
            + String.join(" ", topics != null ? topics : new String[]{})).toLowerCase();
        return text.contains("ai") || text.contains("ml") || text.contains("llm")
            || text.contains("machine learning") || text.contains("deep learning");
    }

    // -------------------------------------------------------------------------
    // 에러 Row 생성 — 분석 실패 시 error_log 기록
    // -------------------------------------------------------------------------

    private static Row buildErrorRow(Row row, String sourceType, Date batchDate, String errorMsg) {
        return switch (sourceType) {
            case "news" -> RowFactory.create(
                safeGet(row, "article_id"), safeGet(row, "title"),
                null, null, null, null,
                null, null, null, null, null, null,
                errorMsg, batchDate
            );
            case "paper" -> RowFactory.create(
                safeGet(row, "paper_id"), safeGet(row, "title"),
                null, null, null, null, null,
                null, null, null, null,
                errorMsg, batchDate
            );
            case "github" -> RowFactory.create(
                safeGet(row, "repo_id"), safeGet(row, "repo_name"),
                null, null, null, null, null, null, null, null, null, null,
                errorMsg, batchDate
            );
            default -> throw new IllegalArgumentException("알 수 없는 source-type: " + sourceType);
        };
    }

    
}
