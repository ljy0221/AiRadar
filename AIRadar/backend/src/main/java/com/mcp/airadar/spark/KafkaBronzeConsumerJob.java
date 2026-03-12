package com.mcp.airadar.spark;

import org.apache.kafka.clients.producer.KafkaProducer;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.apache.kafka.common.serialization.StringSerializer;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.SaveMode;
import org.apache.spark.sql.SparkSession;
import org.apache.spark.sql.streaming.StreamingQuery;
import org.apache.spark.sql.streaming.Trigger;
import org.apache.spark.sql.types.DataTypes;
import org.apache.spark.sql.types.StructField;
import org.apache.spark.sql.types.StructType;

import java.time.Instant;
import java.util.Properties;

import static com.mcp.airadar.spark.utils.SparkUtils.getArg;
import static org.apache.spark.sql.functions.*;

/**
 * Kafka → Bronze Delta Lake 적재 Job (Spark Structured Streaming)
 *
 * 크롤링 서버가 Kafka에 메시지를 발행할 준비가 되면 이 Job으로 전환한다.
 * 현재는 BronzeIngestionJob(HTTP 직접 호출)이 임시 대역이다.
 *
 * Kafka 토픽 규칙 (KAFKA_TOPIC_PREFIX 환경변수로 제어, 기본: airader.raw):
 *   airader.raw.news   — 뉴스 기사 (aitimes, gdelt 공통)
 *   airader.raw.github — GitHub 레포지터리
 *   airader.raw.paper  — 논문 (향후)
 *
 * Kafka 메시지 형식 (CrawledArticle JSON):
 *   key   : article_id / repo_id (String, nullable)
 *   value : CrawledArticle JSON (UTF-8)
 *
 * 실행 방법:
 *   ./gradlew runSparkJob -Pjob=KafkaBronzeConsumerJob -PsourceType=news
 *   ./gradlew runSparkJob -Pjob=KafkaBronzeConsumerJob -PsourceType=github
 *
 * 환경변수:
 *   KAFKA_BOOTSTRAP_SERVERS : Kafka 브로커 (기본: localhost:9092)
 *   KAFKA_TOPIC_PREFIX      : Kafka 토픽 prefix (기본: airader.raw)
 *   KAFKA_CHECKPOINT_PATH   : Spark Streaming 체크포인트 루트 (기본: /tmp/kafka-checkpoint)
 *   KAFKA_STARTING_OFFSETS  : earliest | latest (기본: latest)
 *   BRONZE_BASE_PATH        : Bronze Delta Lake 루트 (기본: /tmp/bronze)
 *   MINIO_*                 : BronzeIngestionJob과 동일
 *
 * 실행 방식:
 *   Trigger.AvailableNow() — 현재 적재된 Kafka 메시지를 모두 처리한 뒤 종료.
 *   Airflow SparkSubmitOperator에서 배치처럼 호출 가능.
 *   체크포인트 덕분에 중복 처리 없이 정확히 1회(exactly-once) 처리를 보장한다.
 */
public class KafkaBronzeConsumerJob {

    private static final String KAFKA_BOOTSTRAP_SERVERS =
        System.getenv().getOrDefault("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092");

    private static final String KAFKA_CHECKPOINT_PATH =
        System.getenv().getOrDefault("KAFKA_CHECKPOINT_PATH", "/tmp/kafka-checkpoint");

    private static final String KAFKA_TOPIC_PREFIX =
        System.getenv().getOrDefault("KAFKA_TOPIC_PREFIX", "airader.raw");

    private static final String KAFKA_STARTING_OFFSETS =
        System.getenv().getOrDefault("KAFKA_STARTING_OFFSETS", "latest");

    // -------------------------------------------------------------------------
    // Kafka 메시지 파싱 스키마 (크롤링 서버 CrawledArticle 구조)
    // -------------------------------------------------------------------------

    /** 논문 extra 필드 (크롤링 서버 arxiv_api.py 기준) */
    private static final StructType PAPER_EXTRA_SCHEMA = DataTypes.createStructType(new StructField[]{
        DataTypes.createStructField("updated_at",        DataTypes.StringType, true),
        DataTypes.createStructField("pdf_url",           DataTypes.StringType, true),
        DataTypes.createStructField("categories",        DataTypes.createArrayType(DataTypes.StringType), true),
        DataTypes.createStructField("primary_category",  DataTypes.StringType, true),
        DataTypes.createStructField("search_query",      DataTypes.StringType, true),
    });

    /** GitHub extra 필드 (크롤링 서버 github_api.py 기준) */
    private static final StructType GITHUB_EXTRA_SCHEMA = DataTypes.createStructType(new StructField[]{
        DataTypes.createStructField("full_name",      DataTypes.StringType,    true),
        DataTypes.createStructField("language",       DataTypes.StringType,    true),
        DataTypes.createStructField("stars",          DataTypes.LongType,      true),
        DataTypes.createStructField("forks",          DataTypes.LongType,      true),
        DataTypes.createStructField("topics",         DataTypes.createArrayType(DataTypes.StringType), true),
        DataTypes.createStructField("readme_excerpt", DataTypes.StringType,    true),
    });

    /** 논문 메시지 스키마 (크롤링 서버 CrawledArticle 기준) */
    private static final StructType PAPER_MESSAGE_SCHEMA = DataTypes.createStructType(new StructField[]{
        DataTypes.createStructField("source",       DataTypes.StringType, true),
        DataTypes.createStructField("url",          DataTypes.StringType, true),
        DataTypes.createStructField("title",        DataTypes.StringType, true),
        DataTypes.createStructField("author",       DataTypes.StringType, true),
        DataTypes.createStructField("published_at", DataTypes.StringType, true),
        DataTypes.createStructField("body",         DataTypes.StringType, true),
        DataTypes.createStructField("extra",        PAPER_EXTRA_SCHEMA,   true),
    });

    /** 뉴스 메시지 스키마 */
    private static final StructType NEWS_MESSAGE_SCHEMA = DataTypes.createStructType(new StructField[]{
        DataTypes.createStructField("source",       DataTypes.StringType, true),
        DataTypes.createStructField("url",          DataTypes.StringType, true),
        DataTypes.createStructField("title",        DataTypes.StringType, true),
        DataTypes.createStructField("author",       DataTypes.StringType, true),
        DataTypes.createStructField("published_at", DataTypes.StringType, true),
        DataTypes.createStructField("body",         DataTypes.StringType, true),
    });

    /** GitHub 메시지 스키마 (extra 중첩 구조 포함) */
    private static final StructType GITHUB_MESSAGE_SCHEMA = DataTypes.createStructType(new StructField[]{
        DataTypes.createStructField("source",       DataTypes.StringType,   true),
        DataTypes.createStructField("url",          DataTypes.StringType,   true),
        DataTypes.createStructField("title",        DataTypes.StringType,   true),
        DataTypes.createStructField("published_at", DataTypes.StringType,   true),
        DataTypes.createStructField("body",         DataTypes.StringType,   true),
        DataTypes.createStructField("extra",        GITHUB_EXTRA_SCHEMA,    true),
    });

    // -------------------------------------------------------------------------
    // main
    // -------------------------------------------------------------------------

    public static void main(String[] args) throws Exception {
        String sourceType = getArg(args, "--source-type");
        if (sourceType == null) {
            throw new IllegalArgumentException("필수 인자 누락: --source-type (news | github | paper)");
        }

        SparkSession spark = SparkSession.builder()
            .appName("KafkaBronzeConsumerJob-" + sourceType)
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

        String topic = KAFKA_TOPIC_PREFIX + "." + sourceType;
        String checkpointPath = KAFKA_CHECKPOINT_PATH + "/" + sourceType;
        String bronzeOutputPath = System.getenv().getOrDefault("BRONZE_BASE_PATH", "/tmp/bronze")
            + "/" + sourceType;

        System.out.println("[Bronze Kafka] 토픽: " + topic);
        System.out.println("[Bronze Kafka] 체크포인트: " + checkpointPath);
        System.out.println("[Bronze Kafka] 출력 경로: " + bronzeOutputPath);

        try {
            consume(spark, sourceType, topic, checkpointPath, bronzeOutputPath);
        } finally {
            spark.stop();
        }
    }

    // -------------------------------------------------------------------------
    // 스트리밍 파이프라인
    // -------------------------------------------------------------------------

    private static void consume(
            SparkSession spark,
            String sourceType,
            String topic,
            String checkpointPath,
            String bronzeOutputPath) throws Exception {

        // Kafka Raw 스트림 읽기 (value = JSON bytes)
        Dataset<Row> kafkaStream = spark.readStream()
            .format("kafka")
            .option("kafka.bootstrap.servers", KAFKA_BOOTSTRAP_SERVERS)
            .option("subscribe", topic)
            .option("startingOffsets", KAFKA_STARTING_OFFSETS)
            .option("failOnDataLoss", "false")           // 오프셋 만료 시 스킵
            .option("kafka.session.timeout.ms", "30000")
            .load();

        // value bytes → String
        Dataset<Row> valueStream = kafkaStream.select(
            col("value").cast("string").as("raw_json"),
            col("timestamp").as("kafka_timestamp")
        );

        // source-type별 파싱 및 Bronze 스키마 변환
        Dataset<Row> bronzeStream = switch (sourceType) {
            case "news"   -> parseNews(valueStream);
            case "github" -> parseGithub(valueStream);
            case "paper"  -> parsePaper(valueStream);
            default -> throw new IllegalArgumentException("지원하지 않는 source-type: " + sourceType
                + " (지원: news, github, paper)");
        };

        // foreachBatch: 각 마이크로배치를 Delta Lake에 Append
        // batch_date 파티션 덕분에 SilverRefinementJob이 날짜별로 읽을 수 있다
        StreamingQuery query = bronzeStream.writeStream()
            .format("delta")
            .outputMode("append")
            .option("checkpointLocation", checkpointPath)
            .partitionBy("batch_date")
            .trigger(Trigger.AvailableNow())   // 현재 메시지 모두 처리 후 종료 (배치 모드)
            .start(bronzeOutputPath);

        query.awaitTermination();

        System.out.println("[Bronze Kafka] 처리 완료: " + bronzeOutputPath);
        publishDoneEvent(sourceType);
    }

    // -------------------------------------------------------------------------
    // 파이프라인 완료 이벤트 발행
    // -------------------------------------------------------------------------

    private static void publishDoneEvent(String sourceType) {
        String eventTopic = "airader.pipeline.bronze.done";
        Properties props = new Properties();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, KAFKA_BOOTSTRAP_SERVERS);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, StringSerializer.class.getName());

        String payload = String.format(
            "{\"event_type\":\"pipeline.bronze.done\",\"source_type\":\"%s\",\"timestamp\":\"%s\"}",
            sourceType, Instant.now().toString()
        );

        try (KafkaProducer<String, String> producer = new KafkaProducer<>(props)) {
            producer.send(new ProducerRecord<>(eventTopic, sourceType, payload)).get();
            System.out.println("[Bronze Kafka] 완료 이벤트 발행 → " + eventTopic);
        } catch (Exception e) {
            System.err.println("[Bronze Kafka] 완료 이벤트 발행 실패 (무시): " + e.getMessage());
        }
    }

    // -------------------------------------------------------------------------
    // 뉴스 파싱 → Bronze 스키마 변환
    // -------------------------------------------------------------------------

    private static Dataset<Row> parseNews(Dataset<Row> valueStream) {
        Dataset<Row> parsed = valueStream.select(
            from_json(col("raw_json"), NEWS_MESSAGE_SCHEMA).as("msg"),
            col("kafka_timestamp")
        );

        // published_at이 유효하면 해당 날짜, 없으면 current_date()
        return parsed.select(
            sha1(col("msg.url")).as("article_id"),
            col("msg.title").as("title"),
            col("msg.body").as("content"),
            col("msg.url").as("url"),
            col("msg.source").as("source"),
            col("msg.author").as("author"),
            col("msg.published_at").as("published_at"),
            col("kafka_timestamp").as("crawled_at"),
            when(col("msg.published_at").isNotNull(), to_date(col("msg.published_at")))
                .otherwise(current_date()).as("batch_date")
        ).filter(col("article_id").isNotNull());
    }

    // -------------------------------------------------------------------------
    // 논문 파싱 → Bronze 스키마 변환
    // -------------------------------------------------------------------------

    private static Dataset<Row> parsePaper(Dataset<Row> valueStream) {
        Dataset<Row> parsed = valueStream.select(
            from_json(col("raw_json"), PAPER_MESSAGE_SCHEMA).as("msg"),
            col("kafka_timestamp")
        );

        // SilverRefinementJob이 Bronze에서 읽는 컬럼과 일치:
        // paper_id, title, abstract, url, source, authors, published_at, batch_date
        return parsed.select(
            sha1(col("msg.url")).as("paper_id"),
            col("msg.title").as("title"),
            col("msg.body").as("abstract"),        // body → abstract
            col("msg.url").as("url"),
            col("msg.source").as("source"),
            col("msg.author").as("author"),        // 대표 저자 (단일)
            array(col("msg.author")).as("authors"), // SilverRefinementJob이 배열로 읽음
            col("msg.published_at").as("published_at"),
            col("kafka_timestamp").as("crawled_at"),
            when(col("msg.published_at").isNotNull(), to_date(col("msg.published_at")))
                .otherwise(current_date()).as("batch_date")
        ).filter(col("paper_id").isNotNull());
    }

    // -------------------------------------------------------------------------
    // GitHub 파싱 → Bronze 스키마 변환
    // -------------------------------------------------------------------------

    private static Dataset<Row> parseGithub(Dataset<Row> valueStream) {
        Dataset<Row> parsed = valueStream.select(
            from_json(col("raw_json"), GITHUB_MESSAGE_SCHEMA).as("msg"),
            col("kafka_timestamp")
        );

        return parsed.select(
            // repo_id: full_name 우선, 없으면 URL SHA1
            when(col("msg.extra.full_name").isNotNull().and(col("msg.extra.full_name").notEqual("")),
                col("msg.extra.full_name"))
                .otherwise(sha1(col("msg.url"))).as("repo_id"),
            col("msg.title").as("repo_name"),
            col("msg.body").as("description"),
            col("msg.url").as("url"),
            col("msg.source").as("source"),
            col("msg.extra.language").as("language"),
            col("msg.extra.stars").as("stars"),
            col("msg.extra.forks").as("forks"),
            lit(null).cast(DataTypes.IntegerType).as("open_issues"),     // 크롤러 미제공
            col("msg.extra.topics").as("topics"),
            lit(null).cast(DataTypes.IntegerType).as("weekly_commits"),  // 크롤러 미제공
            lit(null).cast(DataTypes.IntegerType).as("star_delta_7d"),   // 크롤러 미제공
            col("msg.extra.readme_excerpt").as("readme_excerpt"),
            col("kafka_timestamp").as("crawled_at"),
            when(col("msg.published_at").isNotNull(), to_date(col("msg.published_at")))
                .otherwise(current_date()).as("batch_date")
        ).filter(col("repo_id").isNotNull());
    }
}
