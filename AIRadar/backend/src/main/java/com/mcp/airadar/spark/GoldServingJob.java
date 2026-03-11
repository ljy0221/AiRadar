package com.mcp.airadar.spark;

import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.serialization.StringSerializer;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.SaveMode;
import org.apache.spark.sql.SparkSession;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Instant;
import java.util.Properties;

import static com.mcp.airadar.spark.utils.SparkUtils.getArg;
import static com.mcp.airadar.spark.utils.SparkUtils.silverPath;

/**
 * Silver → Gold Upsert Job
 *
 * Silver Delta Lake 데이터를 PostgreSQL Gold 테이블에 Upsert한다.
 * Staging 테이블 경유 방식으로 ON CONFLICT DO UPDATE 구현.
 * Staging TRUNCATE → INSERT → Upsert 전 과정을 단일 트랜잭션으로 묶어 정합성 보장.
 *
 * 실행 방법:
 *   ./gradlew runSparkJob -Pjob=GoldServingJob --date 2025-03-05
 *
 * 환경변수:
 *   SILVER_BASE_PATH   : Silver Delta Lake 루트 경로
 *   POSTGRES_JDBC_URL  : jdbc:postgresql://host:5432/airadar
 *   POSTGRES_USER      : DB 사용자명
 *   POSTGRES_PASSWORD  : DB 비밀번호
 *
 * 규칙 (spark-jpa.md):
 *   - Spark → PostgreSQL은 JDBC 직접 사용 (JPA EntityManager 호출 금지)
 */
public class GoldServingJob {

    public static void main(String[] args) throws Exception {
        String date = getArg(args, "--date");
        if (date == null) throw new IllegalArgumentException("필수 인자 누락: --date");

        SparkSession spark = SparkSession.builder()
            .appName("GoldServingJob-" + date)
            .master(System.getenv().getOrDefault("SPARK_MASTER", "local[*]"))
            .config("spark.ui.enabled", "false")
            .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension")
            .config("spark.sql.catalog.spark_catalog",
                    "org.apache.spark.sql.delta.catalog.DeltaCatalog")
            // S3A (MinIO) 설정 — 기본값은 로컬 개발 전용, Staging 이상은 환경변수로만 주입
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

        String jdbcUrl  = System.getenv("POSTGRES_JDBC_URL");
        String user     = System.getenv("POSTGRES_USER");
        String password = System.getenv("POSTGRES_PASSWORD");

        if (jdbcUrl == null || user == null || password == null) {
            throw new IllegalStateException(
                "환경변수 누락: POSTGRES_JDBC_URL, POSTGRES_USER, POSTGRES_PASSWORD"
            );
        }

        try {
            upsertNews(spark, date, jdbcUrl, user, password);
            upsertCompanyTimeline(jdbcUrl, user, password);
            upsertPapers(spark, date, jdbcUrl, user, password);
            upsertGithubRepos(spark, date, jdbcUrl, user, password);
            publishDoneEvent(date);
        } finally {
            spark.stop();
        }
    }

    // -------------------------------------------------------------------------
    // 파이프라인 완료 이벤트 발행
    // -------------------------------------------------------------------------

    private static void publishDoneEvent(String date) {
        String kafkaBootstrapServers = System.getenv().getOrDefault("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092");
        String eventTopic = "airader.pipeline.gold.done";

        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, kafkaBootstrapServers);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());

        String payload = String.format(
            "{\"event_type\":\"pipeline.gold.done\",\"batch_date\":\"%s\",\"timestamp\":\"%s\"}",
            date, Instant.now().toString()
        );

        try (KafkaProducer<String, String> producer = new KafkaProducer<>(props)) {
            producer.send(new ProducerRecord<>(eventTopic, date, payload)).get();
            System.out.println("[Gold] 완료 이벤트 발행 → " + eventTopic);
        } catch (Exception e) {
            System.err.println("[Gold] 완료 이벤트 발행 실패 (무시): " + e.getMessage());
        }
    }

    // -------------------------------------------------------------------------
    // news_items Upsert
    // -------------------------------------------------------------------------

    private static void upsertNews(SparkSession spark, String date,
                                   String jdbcUrl, String user, String password) throws SQLException {
        String silverDeltaPath = silverPath("news");
        Dataset<Row> silver = spark.read().format("delta").load(silverDeltaPath)
            .filter("batch_date = '" + date + "' AND error_log IS NULL")
            .dropDuplicates("article_id");

        System.out.println("[Gold/news] Silver 읽기: " + silver.count() + "건");

        writeToStaging(silver, "news_items_staging", jdbcUrl, user, password);

        String upsertSql = """
            INSERT INTO news_items
                (article_id, title, content, url, source, published_at,
                 sentiment, keywords, score, summary, category, region,
                 analyzed_at)
            SELECT
                article_id, title, content, url, source,
                published_at::TIMESTAMP,
                sentiment,
                ARRAY(SELECT jsonb_array_elements_text(to_jsonb(keywords))),
                score, summary, category, region,
                NOW()
            FROM news_items_staging
            ON CONFLICT (article_id)
            DO UPDATE SET
                sentiment   = EXCLUDED.sentiment,
                keywords    = EXCLUDED.keywords,
                score       = EXCLUDED.score,
                summary     = EXCLUDED.summary,
                category    = EXCLUDED.category,
                region      = EXCLUDED.region,
                analyzed_at = EXCLUDED.analyzed_at,
                updated_at  = NOW();
            """;

        executeInTransaction(jdbcUrl, user, password, "news_items_staging", upsertSql);
        System.out.println("[Gold/news] Upsert 완료");
    }

    // -------------------------------------------------------------------------
    // company_news_timeline Upsert (news_items_staging의 companies 배열 unnest)
    // -------------------------------------------------------------------------

    private static void upsertCompanyTimeline(String jdbcUrl, String user, String password)
            throws SQLException {
        String sql = """
            INSERT INTO company_news_timeline (company_name, article_id, published_at)
            SELECT
                unnest(companies),
                article_id,
                published_at::TIMESTAMP
            FROM news_items_staging
            WHERE companies IS NOT NULL
              AND array_length(companies, 1) > 0
            ON CONFLICT (company_name, article_id) DO NOTHING;
            """;

        Properties props = new Properties();
        props.put("user",     user);
        props.put("password", password);

        try (Connection conn = DriverManager.getConnection(jdbcUrl, props);
             Statement stmt  = conn.createStatement()) {
            int affected = stmt.executeUpdate(sql);
            System.out.println("[Gold/company_timeline] Upsert " + affected + "건");
        }
    }

    // -------------------------------------------------------------------------
    // papers Upsert
    // -------------------------------------------------------------------------

    private static void upsertPapers(SparkSession spark, String date,
                                     String jdbcUrl, String user, String password) throws SQLException {
        String silverDeltaPath = silverPath("paper");
        Dataset<Row> silver = spark.read().format("delta").load(silverDeltaPath)
            .filter("batch_date = '" + date + "' AND error_log IS NULL")
            .dropDuplicates("paper_id");

        System.out.println("[Gold/paper] Silver 읽기: " + silver.count() + "건");

        writeToStaging(silver, "papers_staging", jdbcUrl, user, password);

        String upsertSql = """
            INSERT INTO papers
                (paper_id, title, abstract, url, source, authors,
                 published_at, keywords, summary, category, research_area,
                 analyzed_at)
            SELECT
                paper_id, title, abstract, url, source,
                ARRAY(SELECT jsonb_array_elements_text(to_jsonb(authors))),
                published_at::TIMESTAMP,
                ARRAY(SELECT jsonb_array_elements_text(to_jsonb(keywords))),
                summary, category, research_area,
                NOW()
            FROM papers_staging
            ON CONFLICT (paper_id)
            DO UPDATE SET
                keywords      = EXCLUDED.keywords,
                summary       = EXCLUDED.summary,
                category      = EXCLUDED.category,
                research_area = EXCLUDED.research_area,
                analyzed_at   = EXCLUDED.analyzed_at,
                updated_at    = NOW();
            """;

        executeInTransaction(jdbcUrl, user, password, "papers_staging", upsertSql);
        System.out.println("[Gold/paper] Upsert 완료");
    }

    // -------------------------------------------------------------------------
    // github_repos Upsert
    // -------------------------------------------------------------------------

    private static void upsertGithubRepos(SparkSession spark, String date,
                                          String jdbcUrl, String user, String password) throws SQLException {
        String silverDeltaPath = silverPath("github");
        Dataset<Row> silver = spark.read().format("delta").load(silverDeltaPath)
            .filter("batch_date = '" + date + "' AND error_log IS NULL")
            .dropDuplicates("repo_id");

        System.out.println("[Gold/github] Silver 읽기: " + silver.count() + "건");

        writeToStaging(silver, "github_repos_staging", jdbcUrl, user, password);

        String upsertSql = """
            INSERT INTO github_repos
                (repo_id, repo_name, description, language, topics,
                 stars, forks, open_issues, weekly_commits, star_delta_7d,
                 ai_relevance, keywords, snapshot_date)
            SELECT
                repo_id, repo_name, description, language,
                ARRAY(SELECT jsonb_array_elements_text(to_jsonb(topics))),
                stars, forks, open_issues, weekly_commits, star_delta_7d,
                ai_relevance,
                ARRAY(SELECT jsonb_array_elements_text(to_jsonb(keywords))),
                batch_date
            FROM github_repos_staging
            ON CONFLICT (repo_id)
            DO UPDATE SET
                stars         = EXCLUDED.stars,
                forks         = EXCLUDED.forks,
                open_issues   = EXCLUDED.open_issues,
                weekly_commits = EXCLUDED.weekly_commits,
                star_delta_7d = EXCLUDED.star_delta_7d,
                ai_relevance  = EXCLUDED.ai_relevance,
                keywords      = EXCLUDED.keywords,
                snapshot_date = EXCLUDED.snapshot_date,
                updated_at    = NOW();
            """;

        executeInTransaction(jdbcUrl, user, password, "github_repos_staging", upsertSql);
        System.out.println("[Gold/github] Upsert 완료");
    }

    // -------------------------------------------------------------------------
    // 공통: Staging 테이블에 쓰기
    // -------------------------------------------------------------------------

    private static void writeToStaging(Dataset<Row> df, String stagingTable,
                                       String jdbcUrl, String user, String password) {
        // batchsize: PostgreSQL JDBC 배치 크기 (rewriteBatchedStatements는 MySQL 전용)
        df.write()
            .format("jdbc")
            .option("url",          jdbcUrl)
            .option("dbtable",      stagingTable)
            .option("user",         user)
            .option("password",     password)
            .option("driver",       "org.postgresql.Driver")
            .option("batchsize",    1000)   // PostgreSQL JDBC 배치 크기
            .option("numPartitions", 4)     // 동시 JDBC 연결 수
            .mode(SaveMode.Overwrite)       // Staging은 매번 교체
            .save();
    }

    // -------------------------------------------------------------------------
    // 공통: Staging → Gold Upsert를 단일 트랜잭션으로 실행
    // -------------------------------------------------------------------------

    private static void executeInTransaction(String jdbcUrl, String user, String password,
                                             String stagingTable, String upsertSql) throws SQLException {
        Properties props = new Properties();
        props.put("user",     user);
        props.put("password", password);
        props.put("driver",   "org.postgresql.Driver");

        try (Connection conn = DriverManager.getConnection(jdbcUrl, props)) {
            conn.setAutoCommit(false);
            try (Statement stmt = conn.createStatement()) {
                // Staging → Gold Upsert (writeToStaging의 Overwrite가 이미 교체 완료)
                int affected = stmt.executeUpdate(upsertSql);
                System.out.println("[Gold] " + stagingTable + " → Upsert " + affected + "건");

                conn.commit();
            } catch (SQLException e) {
                conn.rollback();
                throw new RuntimeException("Gold Upsert 트랜잭션 실패 (롤백 완료): " + e.getMessage(), e);
            }
        }
    }

    
}
