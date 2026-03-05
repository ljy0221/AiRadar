package com.mcp.airader.spark;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.RowFactory;
import org.apache.spark.sql.SaveMode;
import org.apache.spark.sql.SparkSession;
import org.apache.spark.sql.types.DataTypes;
import org.apache.spark.sql.types.StructField;
import org.apache.spark.sql.types.StructType;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.sql.Date;
import java.time.Duration;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Bronze → Silver 정제 Job
 *
 * 실행 방법:
 *   ./gradlew runSparkJob -Pjob=SilverRefinementJob --date 2025-03-05 --source-type news
 *
 * 환경변수:
 *   BRONZE_BASE_PATH      : Bronze Delta Lake 루트 경로
 *   SILVER_BASE_PATH      : Silver Delta Lake 루트 경로
 *   AI_SERVER_URL         : AI 분석 서버 URL (기본: http://localhost:8000)
 *   AI_SERVER_CONCURRENCY : Spark 파티션 수 = AI 서버 동시 요청 수 (기본 10)
 *   AI_BATCH_SIZE         : 배치당 레코드 수 (기본 10)
 *
 * 규칙:
 *   - Bronze는 절대 수정하지 않는다 (ReadOnly)
 *   - AI 서버 호출 실패 시 error_log에 기록하고 skip (파이프라인 중단 금지)
 *   - 같은 --date로 재실행 시 Silver Overwrite → 멱등성 보장
 */
public class SilverRefinementJob {

    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(5))
        .build();

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private static final String AI_SERVER_URL =
        System.getenv().getOrDefault("AI_SERVER_URL", "http://localhost:8000");

    private static final int AI_BATCH_SIZE = Integer.parseInt(
        System.getenv().getOrDefault("AI_BATCH_SIZE", "10")
    );

    // Silver 스키마: news (embedding은 ai-server가 content_embeddings 테이블에 직접 저장)
    private static final StructType NEWS_SILVER_SCHEMA = DataTypes.createStructType(new StructField[]{
        DataTypes.createStructField("article_id",   DataTypes.StringType,    false),
        DataTypes.createStructField("title",        DataTypes.StringType,    true),
        DataTypes.createStructField("content",      DataTypes.StringType,    true),
        DataTypes.createStructField("url",          DataTypes.StringType,    true),
        DataTypes.createStructField("source",       DataTypes.StringType,    true),
        DataTypes.createStructField("published_at", DataTypes.StringType,    true),
        DataTypes.createStructField("sentiment",    DataTypes.StringType,    true),
        DataTypes.createStructField("keywords",     DataTypes.createArrayType(DataTypes.StringType), true),
        DataTypes.createStructField("score",        DataTypes.DoubleType,    true),
        DataTypes.createStructField("summary",      DataTypes.StringType,    true),
        DataTypes.createStructField("category",     DataTypes.StringType,    true),
        DataTypes.createStructField("region",       DataTypes.StringType,    true),
        DataTypes.createStructField("error_log",    DataTypes.StringType,    true),
        DataTypes.createStructField("batch_date",   DataTypes.DateType,      false),
    });

    // Silver 스키마: paper (embedding은 ai-server가 content_embeddings 테이블에 직접 저장)
    private static final StructType PAPER_SILVER_SCHEMA = DataTypes.createStructType(new StructField[]{
        DataTypes.createStructField("paper_id",     DataTypes.StringType,   false),
        DataTypes.createStructField("title",        DataTypes.StringType,   true),
        DataTypes.createStructField("abstract",     DataTypes.StringType,   true),
        DataTypes.createStructField("url",          DataTypes.StringType,   true),
        DataTypes.createStructField("source",       DataTypes.StringType,   true),
        DataTypes.createStructField("authors",      DataTypes.createArrayType(DataTypes.StringType), true),
        DataTypes.createStructField("published_at", DataTypes.StringType,   true),
        DataTypes.createStructField("keywords",     DataTypes.createArrayType(DataTypes.StringType), true),
        DataTypes.createStructField("summary",      DataTypes.StringType,   true),
        DataTypes.createStructField("category",     DataTypes.StringType,   true),
        DataTypes.createStructField("research_area",DataTypes.StringType,   true),
        DataTypes.createStructField("error_log",    DataTypes.StringType,   true),
        DataTypes.createStructField("batch_date",   DataTypes.DateType,     false),
    });

    // Silver 스키마: github (AI 분석 없음 — embedding 불포함)
    private static final StructType GITHUB_SILVER_SCHEMA = DataTypes.createStructType(new StructField[]{
        DataTypes.createStructField("repo_id",       DataTypes.StringType,   false),
        DataTypes.createStructField("repo_name",     DataTypes.StringType,   true),
        DataTypes.createStructField("description",   DataTypes.StringType,   true),
        DataTypes.createStructField("language",      DataTypes.StringType,   true),
        DataTypes.createStructField("topics",        DataTypes.createArrayType(DataTypes.StringType), true),
        DataTypes.createStructField("stars",         DataTypes.LongType,     true),
        DataTypes.createStructField("forks",         DataTypes.LongType,     true),
        DataTypes.createStructField("open_issues",   DataTypes.IntegerType,  true),
        DataTypes.createStructField("weekly_commits",DataTypes.IntegerType,  true),
        DataTypes.createStructField("star_delta_7d", DataTypes.IntegerType,  true),
        DataTypes.createStructField("ai_relevance",  DataTypes.BooleanType,  true),
        DataTypes.createStructField("keywords",      DataTypes.createArrayType(DataTypes.StringType), true),
        DataTypes.createStructField("error_log",     DataTypes.StringType,   true),
        DataTypes.createStructField("batch_date",    DataTypes.DateType,     false),
    });

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
        String bronzePath = System.getenv().getOrDefault("BRONZE_BASE_PATH", "/tmp/bronze")
            + "/" + sourceType + "/date=" + date;
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

        // Overwrite로 멱등성 보장 — Delta 트랜잭션으로 원자적 커밋
        silver.write()
            .format("delta")
            .mode(SaveMode.Overwrite)
            .option("replaceWhere", "batch_date = '" + date + "'")
            .partitionBy("batch_date")
            .save(silverPath);

        long count = silver.count();
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
                List<Row> buffer = new ArrayList<>();
                rows.forEachRemaining(buffer::add);

                List<Row> result = new ArrayList<>();

                if ("github".equals(sourceType)) {
                    // GitHub: AI 호출 없이 정제만 수행
                    for (Row row : buffer) {
                        try {
                            result.add(cleanGithub(row, batchDate));
                        } catch (Exception e) {
                            result.add(buildErrorRow(row, sourceType, batchDate, e.getMessage()));
                        }
                    }
                } else {
                    // news/paper: AI 서버 배치 호출
                    for (int i = 0; i < buffer.size(); i += AI_BATCH_SIZE) {
                        List<Row> batch = buffer.subList(i, Math.min(i + AI_BATCH_SIZE, buffer.size()));
                        try {
                            List<Row> analyzed = switch (sourceType) {
                                case "news"  -> callAnalyzeNewsBatch(batch, batchDate);
                                case "paper" -> callAnalyzePaperBatch(batch, batchDate);
                                default -> throw new IllegalArgumentException("Unknown: " + sourceType);
                            };
                            result.addAll(analyzed);
                        } catch (Exception e) {
                            // 배치 전체 실패 → 각 레코드를 error_log에 기록하고 skip
                            System.err.println("[Silver] 배치 분석 실패: " + e.getMessage());
                            for (Row row : batch) {
                                result.add(buildErrorRow(row, sourceType, batchDate, e.getMessage()));
                            }
                        }
                    }
                }
                return result.iterator();
            }),
            schema
        );
    }

    // -------------------------------------------------------------------------
    // 뉴스 배치 분석 — POST /analyze/news/batch
    // -------------------------------------------------------------------------

    private static List<Row> callAnalyzeNewsBatch(List<Row> rows, Date batchDate) throws Exception {
        List<Map<String, Object>> payload = new ArrayList<>();
        for (Row row : rows) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("article_id",   safeGet(row, "article_id"));
            item.put("title",        safeGet(row, "title"));
            item.put("content",      safeGet(row, "content"));
            item.put("source",       safeGet(row, "source"));
            String publishedAt = safeGet(row, "published_at");
            item.put("published_at", publishedAt != null ? publishedAt : "2025-01-01T00:00:00");
            payload.add(item);
        }

        JsonNode response = postJson("/analyze/news/batch", payload);

        List<Row> result = new ArrayList<>();
        for (int i = 0; i < response.size(); i++) {
            JsonNode item = response.get(i);
            Row original = rows.get(i);

            String[] keywords = parseStringArray(item.get("keywords"));

            result.add(RowFactory.create(
                item.get("article_id").asText(),
                safeGet(original, "title"),
                safeGet(original, "content"),
                safeGet(original, "url"),
                safeGet(original, "source"),
                safeGet(original, "published_at"),
                item.get("sentiment").asText(),
                keywords,
                item.get("score").asDouble(),
                item.get("summary").asText(),
                item.get("category").asText(),
                item.get("region").asText(),
                null,           // error_log
                batchDate
            ));
        }
        return result;
    }

    // -------------------------------------------------------------------------
    // 논문 배치 분석 — POST /analyze/paper/batch
    // -------------------------------------------------------------------------

    private static List<Row> callAnalyzePaperBatch(List<Row> rows, Date batchDate) throws Exception {
        List<Map<String, Object>> payload = new ArrayList<>();
        for (Row row : rows) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("paper_id",     safeGet(row, "paper_id"));
            item.put("title",        safeGet(row, "title"));
            item.put("abstract",     safeGet(row, "abstract"));
            item.put("authors",      safeGetArray(row, "authors"));
            String publishedAt = safeGet(row, "published_at");
            item.put("published_at", publishedAt != null ? publishedAt : "2025-01-01T00:00:00");
            payload.add(item);
        }

        JsonNode response = postJson("/analyze/paper/batch", payload);

        List<Row> result = new ArrayList<>();
        for (int i = 0; i < response.size(); i++) {
            JsonNode item = response.get(i);
            Row original = rows.get(i);

            String[] keywords = parseStringArray(item.get("keywords"));

            result.add(RowFactory.create(
                item.get("paper_id").asText(),
                safeGet(original, "title"),
                safeGet(original, "abstract"),
                safeGet(original, "url"),
                safeGet(original, "source"),
                safeGetArray(original, "authors"),
                safeGet(original, "published_at"),
                keywords,
                item.get("summary").asText(),
                item.get("category").asText(),
                item.get("research_area").asText(),
                null,           // error_log
                batchDate
            ));
        }
        return result;
    }

    // -------------------------------------------------------------------------
    // GitHub 정제 — AI 호출 없이 description/topics 기반 정제
    // -------------------------------------------------------------------------

    private static Row cleanGithub(Row row, Date batchDate) {
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
    // HTTP 유틸
    // -------------------------------------------------------------------------

    private static JsonNode postJson(String path, Object body) throws Exception {
        String requestBody = MAPPER.writeValueAsString(body);
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(AI_SERVER_URL + path))
            .header("Content-Type", "application/json")
            .timeout(Duration.ofSeconds(120))   // 임베딩 생성 포함 넉넉하게
            .POST(HttpRequest.BodyPublishers.ofString(requestBody))
            .build();

        HttpResponse<String> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            throw new RuntimeException("AI 서버 오류 " + response.statusCode() + ": " + response.body());
        }
        return MAPPER.readTree(response.body());
    }

    private static String[] parseStringArray(JsonNode node) {
        if (node == null || !node.isArray()) return new String[]{};
        List<String> list = new ArrayList<>();
        for (JsonNode v : node) list.add(v.asText());
        return list.toArray(new String[0]);
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

    // -------------------------------------------------------------------------
    // 유틸
    // -------------------------------------------------------------------------

    private static String safeGet(Row row, String field) {
        try { return row.getAs(field); } catch (Exception e) { return null; }
    }

    private static String[] safeGetArray(Row row, String field) {
        try {
            scala.collection.Seq<?> seq = row.getAs(field);
            if (seq == null) return new String[]{};
            return scala.collection.JavaConverters.seqAsJavaList(seq)
                .stream().map(Object::toString).toArray(String[]::new);
        } catch (Exception e) { return new String[]{}; }
    }

    private static Long safeLong(Row row, String field) {
        try { return row.getAs(field); } catch (Exception e) { return null; }
    }

    private static Integer safeInt(Row row, String field) {
        try { return row.getAs(field); } catch (Exception e) { return null; }
    }

    /** CLI 인자 파싱: --key value 형식 */
    private static String getArg(String[] args, String key) {
        for (int i = 0; i < args.length - 1; i++) {
            if (args[i].equals(key)) return args[i + 1];
        }
        return null;
    }
}
