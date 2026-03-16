package com.mcp.airadar.spark;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.hc.client5.http.classic.methods.HttpPost;
import org.apache.hc.client5.http.config.RequestConfig;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.core5.http.ContentType;
import org.apache.hc.core5.http.io.entity.EntityUtils;
import org.apache.hc.core5.http.io.entity.StringEntity;
import org.apache.hc.core5.util.Timeout;
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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static com.mcp.airadar.spark.utils.SparkUtils.bronzePath;
import static com.mcp.airadar.spark.utils.SparkUtils.configureS3A;
import static com.mcp.airadar.spark.utils.SparkUtils.getArg;
import static com.mcp.airadar.spark.utils.SparkUtils.safeGet;
import static com.mcp.airadar.spark.utils.SparkUtils.safeGetArray;
import static com.mcp.airadar.spark.utils.SparkUtils.safeInt;
import static com.mcp.airadar.spark.utils.SparkUtils.safeLong;

import static com.mcp.airadar.spark.models.SilverSchemas.*;

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
        DataTypes.createStructField("companies",    DataTypes.createArrayType(DataTypes.StringType), true),
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

        SparkSession.Builder builder = SparkSession.builder()
            .appName("SilverRefinementJob-" + sourceType + "-" + date)
            .master(System.getenv().getOrDefault("SPARK_MASTER", "local[*]"))
            .config("spark.ui.enabled", "false")
            .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension")
            .config("spark.sql.catalog.spark_catalog",
                    "org.apache.spark.sql.delta.catalog.DeltaCatalog");
        configureS3A(builder);
        SparkSession spark = builder.getOrCreate();

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
                    // news/paper: 파티션당 HttpClient를 1회만 생성해 재사용
                    try (CloseableHttpClient client = buildHttpClient()) {
                        for (int i = 0; i < buffer.size(); i += AI_BATCH_SIZE) {
                            List<Row> batch = buffer.subList(i, Math.min(i + AI_BATCH_SIZE, buffer.size()));
                            try {
                                List<Row> analyzed = switch (sourceType) {
                                    case "news"  -> callAnalyzeNewsBatch(client, batch, batchDate);
                                    case "paper" -> callAnalyzePaperBatch(client, batch, batchDate);
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
                }
                return result.iterator();
            }),
            schema
        );
    }

    // -------------------------------------------------------------------------
    // 뉴스 배치 분석 — POST /analyze/news/batch
    // -------------------------------------------------------------------------

    private static List<Row> callAnalyzeNewsBatch(CloseableHttpClient client, List<Row> rows, Date batchDate) throws Exception {
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

        JsonNode response = postJson(client, "/analyze/news/batch", payload);

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
                null,           // companies
                null,           // error_log
                batchDate
            ));
        }
        return result;
    }

    // -------------------------------------------------------------------------
    // 논문 배치 분석 — POST /analyze/paper/batch
    // -------------------------------------------------------------------------

    private static List<Row> callAnalyzePaperBatch(CloseableHttpClient client, List<Row> rows, Date batchDate) throws Exception {
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

        JsonNode response = postJson(client, "/analyze/paper/batch", payload);

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

    private static CloseableHttpClient buildHttpClient() {
        RequestConfig config = RequestConfig.custom()
            .setConnectionRequestTimeout(Timeout.ofSeconds(5))
            .setResponseTimeout(Timeout.ofSeconds(120))
            .build();
        return HttpClients.custom()
            .setDefaultRequestConfig(config)
            .build();
    }

    private static JsonNode postJson(CloseableHttpClient client, String path, Object body) throws Exception {
        String requestBody = MAPPER.writeValueAsString(body);
        HttpPost post = new HttpPost(AI_SERVER_URL + path);
        post.setEntity(new StringEntity(requestBody, ContentType.APPLICATION_JSON));

        return client.execute(post, response -> {
            int status = response.getCode();
            String responseBody = EntityUtils.toString(response.getEntity());
            if (status != 200) {
                throw new RuntimeException("AI 서버 오류 " + status + ": " + responseBody);
            }
            return MAPPER.readTree(responseBody);
        });
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
                null,       // companies (에러 시 null)
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
