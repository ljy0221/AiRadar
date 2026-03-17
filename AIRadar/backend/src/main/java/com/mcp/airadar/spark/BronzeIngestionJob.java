package com.mcp.airadar.spark;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
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
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Date;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import static com.mcp.airadar.spark.utils.SparkUtils.bronzePath;
import static com.mcp.airadar.spark.utils.SparkUtils.configureS3A;
import static com.mcp.airadar.spark.utils.SparkUtils.getArg;

/**
 * Crawling Server → Bronze Delta Lake 적재 Job
 *
 * 실행 방법:
 *   ./gradlew runSparkJob -Pjob=BronzeIngestionJob -Pdate=2025-03-09 -PsourceType=news
 *   ./gradlew runSparkJob -Pjob=BronzeIngestionJob -Pdate=2025-03-09 -PsourceType=github
 *
 * 환경변수:
 *   CRAWL_SERVER_URL : 크롤링 서버 URL (기본: http://localhost:8002)
 *   BRONZE_BASE_PATH : Bronze Delta Lake 루트 경로
 *   MINIO_*          : SilverRefinementJob과 동일
 *
 * 규칙:
 *   - Bronze는 원본 그대로 보존 (정제 없음)
 *   - article_id / repo_id 는 URL SHA1 해시 → 재수집 시 멱등성 보장
 *   - 같은 --date로 재실행 시 해당 파티션 Overwrite → 멱등성 보장
 *   - news 소스는 aitimes + gdelt 두 provider를 모두 호출하여 병합 적재
 */
public class BronzeIngestionJob {

    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(10))
        .build();

    private static final ObjectMapper MAPPER = new ObjectMapper();

    private static final String CRAWL_SERVER_URL =
        System.getenv().getOrDefault("CRAWL_SERVER_URL", "http://localhost:8002");

    // Bronze 스키마: news — Silver이 읽는 컬럼과 일치
    private static final StructType NEWS_BRONZE_SCHEMA = DataTypes.createStructType(new StructField[]{
        DataTypes.createStructField("article_id",   DataTypes.StringType,    false),
        DataTypes.createStructField("title",        DataTypes.StringType,    true),
        DataTypes.createStructField("content",      DataTypes.StringType,    true),
        DataTypes.createStructField("url",          DataTypes.StringType,    true),
        DataTypes.createStructField("source",       DataTypes.StringType,    true),
        DataTypes.createStructField("author",       DataTypes.StringType,    true),
        DataTypes.createStructField("published_at", DataTypes.StringType,    true),
        DataTypes.createStructField("crawled_at",   DataTypes.TimestampType, true),
        DataTypes.createStructField("batch_date",   DataTypes.DateType,      false),
    });

    // Bronze 스키마: github — Silver이 읽는 컬럼과 일치
    private static final StructType GITHUB_BRONZE_SCHEMA = DataTypes.createStructType(new StructField[]{
        DataTypes.createStructField("repo_id",        DataTypes.StringType,    false),
        DataTypes.createStructField("repo_name",      DataTypes.StringType,    true),
        DataTypes.createStructField("description",    DataTypes.StringType,    true),
        DataTypes.createStructField("url",            DataTypes.StringType,    true),
        DataTypes.createStructField("source",         DataTypes.StringType,    true),
        DataTypes.createStructField("language",       DataTypes.StringType,    true),
        DataTypes.createStructField("stars",          DataTypes.LongType,      true),
        DataTypes.createStructField("forks",          DataTypes.LongType,      true),
        DataTypes.createStructField("open_issues",    DataTypes.IntegerType,   true),
        DataTypes.createStructField("topics",         DataTypes.createArrayType(DataTypes.StringType), true),
        DataTypes.createStructField("weekly_commits", DataTypes.IntegerType,   true),
        DataTypes.createStructField("star_delta_7d",  DataTypes.IntegerType,   true),
        DataTypes.createStructField("readme_excerpt", DataTypes.StringType,    true),
        DataTypes.createStructField("crawled_at",     DataTypes.TimestampType, true),
        DataTypes.createStructField("batch_date",     DataTypes.DateType,      false),
    });

    public static void main(String[] args) {
        String date = getArg(args, "--date");
        String sourceType = getArg(args, "--source-type");

        if (date == null || sourceType == null) {
            throw new IllegalArgumentException("필수 인자 누락: --date, --source-type");
        }

        SparkSession.Builder builder = SparkSession.builder()
            .appName("BronzeIngestionJob-" + sourceType + "-" + date)
            .master(System.getenv().getOrDefault("SPARK_MASTER", "local[*]"))
            .config("spark.ui.enabled", "false")
            .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension")
            .config("spark.sql.catalog.spark_catalog",
                    "org.apache.spark.sql.delta.catalog.DeltaCatalog");
        configureS3A(builder);
        SparkSession spark = builder.getOrCreate();

        spark.sparkContext().setLogLevel("WARN");

        try {
            ingestToBronze(spark, date, sourceType);
        } finally {
            spark.stop();
        }
    }

    private static void ingestToBronze(SparkSession spark, String date, String sourceType) {
        String outputPath = bronzePath(sourceType);
        System.out.println("[Bronze] 적재 시작: source=" + sourceType + ", date=" + date);
        System.out.println("[Bronze] 출력 경로: " + outputPath);

        List<Row> rows;
        StructType schema;

        switch (sourceType) {
            case "news" -> {
                rows = crawlNews(date);
                schema = NEWS_BRONZE_SCHEMA;
            }
            case "github" -> {
                rows = crawlGithub(date);
                schema = GITHUB_BRONZE_SCHEMA;
            }
            default -> throw new IllegalArgumentException("지원하지 않는 source-type: " + sourceType
                + " (지원: news, github)");
        }

        if (rows.isEmpty()) {
            System.out.println("[Bronze] 수집된 데이터 없음 — 적재 건너뜀");
            return;
        }

        Dataset<Row> df = spark.createDataFrame(rows, schema);

        // Overwrite로 멱등성 보장 — 같은 날짜 재실행 시 해당 파티션만 교체
        df.write()
            .format("delta")
            .mode(SaveMode.Overwrite)
            .option("replaceWhere", "batch_date = '" + date + "'")
            .partitionBy("batch_date")
            .save(outputPath);

        System.out.println("[Bronze] 완료: " + rows.size() + "건 → " + outputPath);
    }

    // -------------------------------------------------------------------------
    // 뉴스 수집 — aitimes + gdelt 병합
    // -------------------------------------------------------------------------

    private static List<Row> crawlNews(String date) {
        Timestamp crawledAt = Timestamp.from(Instant.now());
        Date batchDate = Date.valueOf(date);
        List<Row> result = new ArrayList<>();

        // aitimes 수집
        try {
            ObjectNode req = MAPPER.createObjectNode();
            req.put("domain", "news");
            req.put("provider", "aitimes");
            req.put("max_articles", 200);
            req.put("max_pages_per_target", 3);
            req.putArray("targets").add("ai_industry").add("ai_company");

            JsonNode items = callCrawlJobs(req);
            System.out.println("[Bronze] aitimes 수집: " + items.size() + "건");
            for (JsonNode item : items) {
                result.add(toNewsRow(item, crawledAt, batchDate));
            }
        } catch (Exception e) {
            System.err.println("[Bronze] aitimes 수집 실패 (건너뜀): " + e.getMessage());
        }

        // gdelt 수집
        try {
            ObjectNode req = MAPPER.createObjectNode();
            req.put("domain", "news");
            req.put("provider", "gdelt");
            req.put("max_articles", 200);
            req.put("window_minutes", 60);

            JsonNode items = callCrawlJobs(req);
            System.out.println("[Bronze] gdelt 수집: " + items.size() + "건");
            for (JsonNode item : items) {
                result.add(toNewsRow(item, crawledAt, batchDate));
            }
        } catch (Exception e) {
            System.err.println("[Bronze] gdelt 수집 실패 (건너뜀): " + e.getMessage());
        }

        return result;
    }

    private static Row toNewsRow(JsonNode item, Timestamp crawledAt, Date batchDate) {
        String url = textOrNull(item, "url");
        return RowFactory.create(
            sha1(url),                        // article_id
            textOrNull(item, "title"),         // title
            textOrNull(item, "body"),          // content
            url,                              // url
            textOrNull(item, "source"),        // source
            textOrNull(item, "author"),        // author
            textOrNull(item, "published_at"),  // published_at
            crawledAt,                        // crawled_at
            batchDate                         // batch_date
        );
    }

    // -------------------------------------------------------------------------
    // GitHub 수집
    // -------------------------------------------------------------------------

    private static List<Row> crawlGithub(String date) {
        Timestamp crawledAt = Timestamp.from(Instant.now());
        Date batchDate = Date.valueOf(date);

        ObjectNode req = MAPPER.createObjectNode();
        req.put("domain", "github_archive");
        req.put("provider", "github_api");
        req.put("max_articles", 100);
        req.put("github_min_stars", 20);
        req.put("github_created_since_days", 30);
        req.put("github_include_readme", true);

        JsonNode items;
        try {
            items = callCrawlJobs(req);
        } catch (Exception e) {
            System.err.println("[Bronze] github 수집 실패: " + e.getMessage());
            return new ArrayList<>();
        }

        System.out.println("[Bronze] github 수집: " + items.size() + "건");
        List<Row> result = new ArrayList<>();
        for (JsonNode item : items) {
            result.add(toGithubRow(item, crawledAt, batchDate));
        }
        return result;
    }

    private static Row toGithubRow(JsonNode item, Timestamp crawledAt, Date batchDate) {
        String url = textOrNull(item, "url");
        JsonNode extra = item.path("extra");

        // topics 배열 파싱
        String[] topics = new String[]{};
        JsonNode topicsNode = extra.path("topics");
        if (topicsNode.isArray()) {
            List<String> topicList = new ArrayList<>();
            for (JsonNode t : topicsNode) topicList.add(t.asText());
            topics = topicList.toArray(new String[0]);
        }

        // repo_id: full_name 우선, 없으면 URL SHA1
        String repoId = extra.has("full_name") && !extra.path("full_name").asText().isBlank()
            ? extra.path("full_name").asText()
            : sha1(url);

        return RowFactory.create(
            repoId,                                        // repo_id
            textOrNull(item, "title"),                     // repo_name
            textOrNull(item, "body"),                      // description
            url,                                          // url
            textOrNull(item, "source"),                    // source
            extraTextOrNull(extra, "language"),            // language
            extraLong(extra, "stars"),                     // stars
            extraLong(extra, "forks"),                     // forks
            null,                                         // open_issues (크롤러 미제공)
            topics,                                       // topics
            null,                                         // weekly_commits (크롤러 미제공)
            null,                                         // star_delta_7d (크롤러 미제공)
            extraTextOrNull(extra, "readme_excerpt"),      // readme_excerpt
            crawledAt,                                    // crawled_at
            batchDate                                     // batch_date
        );
    }

    // -------------------------------------------------------------------------
    // HTTP 유틸 — POST /crawl/jobs 호출, items[] 반환
    // -------------------------------------------------------------------------

    private static JsonNode callCrawlJobs(ObjectNode requestBody) throws Exception {
        String body = MAPPER.writeValueAsString(requestBody);
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(CRAWL_SERVER_URL + "/crawl/jobs"))
            .header("Content-Type", "application/json")
            .timeout(Duration.ofMinutes(5))   // 크롤링 소요 시간 고려
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .build();

        HttpResponse<String> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            throw new RuntimeException("크롤링 서버 오류 " + response.statusCode() + ": " + response.body());
        }

        JsonNode root = MAPPER.readTree(response.body());
        JsonNode items = root.path("items");
        if (!items.isArray()) {
            throw new RuntimeException("크롤링 서버 응답에 items 배열 없음: " + response.body());
        }
        return items;
    }

    // -------------------------------------------------------------------------
    // 파싱 유틸
    // -------------------------------------------------------------------------

    private static String textOrNull(JsonNode node, String field) {
        JsonNode v = node.path(field);
        return (v.isMissingNode() || v.isNull()) ? null : v.asText();
    }

    private static String extraTextOrNull(JsonNode extra, String field) {
        JsonNode v = extra.path(field);
        return (v.isMissingNode() || v.isNull() || v.asText().isBlank()) ? null : v.asText();
    }

    private static Long extraLong(JsonNode extra, String field) {
        JsonNode v = extra.path(field);
        return (v.isMissingNode() || v.isNull()) ? null : v.asLong();
    }

    /** URL → SHA1 해시 (16진수 40자) — article_id / repo_id 생성 */
    private static String sha1(String input) {
        if (input == null || input.isBlank()) return "unknown-" + System.nanoTime();
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-1");
            byte[] hash = md.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : hash) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) {
            return "sha1-error-" + System.nanoTime();
        }
    }
}
