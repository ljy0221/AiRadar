package com.mcp.airadar.spark;

import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.SparkSession;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

import static com.mcp.airadar.spark.utils.SparkUtils.configureS3A;
import static com.mcp.airadar.spark.utils.SparkUtils.getArg;

public class TrendAggregationJob {
    private static final Map<String, List<String>> TRACKED_KEYWORDS = new LinkedHashMap<>();
    static {
        TRACKED_KEYWORDS.put("Agentic Workflow",
                Arrays.asList("agentic workflow", "agentic ai", "ai agent", "autogpt", "autonomous agent"));
        TRACKED_KEYWORDS.put("RAG",
                Arrays.asList("rag", "retrieval-augmented", "retrieval augmented", "vector search"));
        TRACKED_KEYWORDS.put("Vision Transformers",
                Arrays.asList("vision transformer", "vit", "visual transformer", "image recognition"));
        TRACKED_KEYWORDS.put("Mixture of Experts",
                Arrays.asList("mixture of experts", "moe", "mixtral", "sparse expert"));
        TRACKED_KEYWORDS.put("Fine-tuning",
                Arrays.asList("fine-tuning", "fine tuning", "finetuning", "lora", "qlora", "peft"));
        TRACKED_KEYWORDS.put("Prompt Engineering",
                Arrays.asList("prompt engineering", "prompt design", "in-context learning", "few-shot"));
    }

    private static double WEIGHT_PAPER = 0.10;
    private static double WEIGHT_GITHUB = 0.40;
    private static double WEIGHT_NEWS = 0.40;
    private static double WEIGHT_SENTIMENT = 0.10;

    private static final double THRESHOLD_PEAK = 85.0;
    private static final double THRESHOLD_RISING_WOW = 20.0;
    private static final double THRESHOLD_DECLINING = -15.0;

    public static void main(String[] args) throws Exception {
        String dateStr = getArg(args, "--date");
        if (dateStr == null) {
            dateStr = LocalDate.now().toString();
        }

        String wp = getArg(args, "--weight-paper");
        if (wp != null)
            WEIGHT_PAPER = Double.parseDouble(wp);
        String wg = getArg(args, "--weight-github");
        if (wg != null)
            WEIGHT_GITHUB = Double.parseDouble(wg);
        String wn = getArg(args, "--weight-news");
        if (wn != null)
            WEIGHT_NEWS = Double.parseDouble(wn);
        String ws = getArg(args, "--weight-sentiment");
        if (ws != null)
            WEIGHT_SENTIMENT = Double.parseDouble(ws);

        SparkSession.Builder builder = SparkSession.builder()
                .appName("TrendAggregationJob-" + dateStr)
                .master(System.getenv().getOrDefault("SPARK_MASTER", "local[*]"))
                .config("spark.ui.enabled", "false")
                .config("spark.sql.extensions", "io.delta.sql.DeltaSparkSessionExtension")
                .config("spark.sql.catalog.spark_catalog", "org.apache.spark.sql.delta.catalog.DeltaCatalog");
        configureS3A(builder);
        SparkSession spark = builder.getOrCreate();
        spark.sparkContext().setLogLevel("WARN");

        try {
            processAggregation(spark, dateStr);
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

    private static void processAggregation(SparkSession spark, String dateStr) throws Exception {
        String silverBasePath = System.getenv().getOrDefault("SILVER_BASE_PATH", "/tmp/silver");
        System.out.println("트렌드 집계 시작 (Spark): " + dateStr);

        Dataset<Row> newsDf = null;
        try {
            newsDf = spark.read().format("delta").load(silverBasePath + "/news").where("batch_date = '" + dateStr + "'")
                    .cache();
        } catch (Exception e) {
            System.err.println("News Data Not Found: " + e.getMessage());
        }

        Dataset<Row> paperDf = null;
        try {
            paperDf = spark.read().format("delta").load(silverBasePath + "/paper")
                    .where("batch_date = '" + dateStr + "'").cache();
        } catch (Exception e) {
            System.err.println("Paper Data Not Found: " + e.getMessage());
        }

        Dataset<Row> githubDf = null;
        try {
            githubDf = spark.read().format("delta").load(silverBasePath + "/github")
                    .where("batch_date = '" + dateStr + "'").cache();
        } catch (Exception e) {
            System.err.println("Github Data Not Found: " + e.getMessage());
        }

        try (Connection conn = getPostgresConnection()) {
            conn.setAutoCommit(false);
            LocalDate targetDate = LocalDate.parse(dateStr, DateTimeFormatter.ISO_LOCAL_DATE);

            for (Map.Entry<String, List<String>> entry : TRACKED_KEYWORDS.entrySet()) {
                String keyword = entry.getKey();
                String variantsListStr = entry.getValue().stream()
                        .map(v -> "'" + v.replace("'", "''") + "'")
                        .reduce((a, b) -> a + "," + b).orElse("");

                System.out.println("처리 중: [" + keyword + "]");

                long newsMentions = 0;
                double avgSentiment = 0.0;
                if (newsDf != null) {
                    String cond = "EXISTS(keywords, k -> lower(k) IN (" + variantsListStr + "))";
                    Row r = newsDf.where(cond).selectExpr(
                            "COUNT(*) as cnt",
                            "COALESCE(AVG(CASE WHEN sentiment = 'POSITIVE' THEN 1.0 WHEN sentiment = 'NEGATIVE' THEN -1.0 ELSE 0.0 END), 0.0) as avg_s")
                            .first();
                    Number nCnt = r.getAs("cnt");
                    if (nCnt != null)
                        newsMentions = nCnt.longValue();
                    Number nAvg = r.getAs("avg_s");
                    if (nAvg != null)
                        avgSentiment = nAvg.doubleValue();
                }

                long paperMentions = 0;
                if (paperDf != null) {
                    String cond = "EXISTS(keywords, k -> lower(k) IN (" + variantsListStr + "))";
                    paperMentions = paperDf.where(cond).count();
                }

                long githubActivity = 0;
                if (githubDf != null) {
                    String cond = "EXISTS(topics, t -> lower(t) IN (" + variantsListStr + "))";
                    Row r = githubDf
                            .where(cond).selectExpr("COALESCE(SUM(star_delta_7d), 0) as s").first();
                    Number val = r.getAs("s");
                    if (val != null)
                        githubActivity = Math.max(0, val.longValue());
                }

                System.out.printf("     뉴스: %d건 | 논문: %d건 | 깃허브 ★: +%d | 감성: %.2f%n", newsMentions, paperMentions,
                        githubActivity, avgSentiment);

                upsertKeywordDaily(conn, keyword, targetDate, "NEWS", newsMentions, avgSentiment, 0);
                upsertKeywordDaily(conn, keyword, targetDate, "PAPER", paperMentions, 0.0, 0);
                upsertKeywordDaily(conn, keyword, targetDate, "GITHUB", 0, 0.0, githubActivity);

                double trendScore = calculateTrendScore(paperMentions, githubActivity, newsMentions, avgSentiment);

                Double lastWeekCount = getLastWeekNewsCount(conn, keyword, targetDate);
                double weekOverWeek = 0.0;
                if (lastWeekCount != null && lastWeekCount > 0) {
                    weekOverWeek = Math.round((newsMentions - lastWeekCount) / lastWeekCount * 100.0 * 1000.0) / 1000.0;
                }

                double velocity = Math.round(
                        (paperMentions + newsMentions - (lastWeekCount != null ? lastWeekCount : 0)) * 0.1 * 10000.0)
                        / 10000.0;

                String status = determineStatus(trendScore, weekOverWeek, velocity);

                System.out.printf("     trendScore: %.1f | WoW: %+.1f%% | 상태: %s%n", trendScore, weekOverWeek, status);

                upsertLifecycle(conn, keyword, trendScore, velocity, weekOverWeek, status, targetDate);
            }
            conn.commit();
        }

        if (newsDf != null)
            newsDf.unpersist();
        if (paperDf != null)
            paperDf.unpersist();
        if (githubDf != null)
            githubDf.unpersist();

        System.out.println("집계 완료: " + dateStr + " (Spark Java)");
    }

    private static double calculateTrendScore(long paper, long github, long news, double avgSentiment) {
        double paperScore = Math.min((double) paper / 50.0, 1.0) * 100.0;
        double githubScore = Math.min((double) github / 5000.0, 1.0) * 100.0;
        double newsScore = Math.min((double) news / 100.0, 1.0) * 100.0;
        double sentimentScore = (avgSentiment + 1.0) / 2.0 * 100.0;

        return Math.round((paperScore * WEIGHT_PAPER + githubScore * WEIGHT_GITHUB + newsScore * WEIGHT_NEWS
                + sentimentScore * WEIGHT_SENTIMENT) * 10000.0) / 10000.0;
    }

    private static void upsertKeywordDaily(Connection conn, String keyword, LocalDate date, String sourceType,
            long mentions, double sentiment, long commits) throws Exception {
        String sql = "INSERT INTO tech_keyword_daily (keyword, stat_date, source_type, mention_count, avg_sentiment, commit_count) "
                +
                "VALUES (?, ?, ?, ?, ?, ?) " +
                "ON CONFLICT (keyword, stat_date, source_type) DO UPDATE SET " +
                "mention_count = EXCLUDED.mention_count, avg_sentiment = EXCLUDED.avg_sentiment, commit_count = EXCLUDED.commit_count";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, keyword);
            ps.setDate(2, java.sql.Date.valueOf(date));
            ps.setString(3, sourceType);
            ps.setLong(4, mentions);
            ps.setDouble(5, sentiment);
            ps.setLong(6, commits);
            ps.executeUpdate();
        }
    }

    private static Double getLastWeekNewsCount(Connection conn, String keyword, LocalDate date) throws Exception {
        LocalDate weekAgo = date.minusDays(7);
        String sql = "SELECT mention_count FROM tech_keyword_daily WHERE keyword = ? AND stat_date = ? AND source_type = 'NEWS'";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, keyword);
            ps.setDate(2, java.sql.Date.valueOf(weekAgo));
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return rs.getDouble(1);
                }
            }
        }
        return null;
    }

    private static String determineStatus(double trendScore, double wow, double velocity) {
        if (trendScore >= THRESHOLD_PEAK)
            return "PEAK";
        if (wow >= THRESHOLD_RISING_WOW && velocity > 0)
            return "GROWING";
        if (wow <= THRESHOLD_DECLINING)
            return "DECLINING";
        if (trendScore < 10.0)
            return "DORMANT";
        return "EMERGING";
    }

    private static void upsertLifecycle(Connection conn, String keyword, double score, double velocity, double wow,
            String status, LocalDate date) throws Exception {
        String sql = "INSERT INTO tech_lifecycle (keyword, status, trend_score, velocity, week_over_week, first_seen_date, updated_at) "
                +
                "VALUES (?, ?, ?, ?, ?, ?, NOW()) " +
                "ON CONFLICT (keyword) DO UPDATE SET " +
                "status = EXCLUDED.status, trend_score = EXCLUDED.trend_score, velocity = EXCLUDED.velocity, " +

                "week_over_week = EXCLUDED.week_over_week, " +
                "peak_date = CASE WHEN EXCLUDED.status = 'PEAK' AND tech_lifecycle.peak_date IS NULL THEN EXCLUDED.first_seen_date ELSE tech_lifecycle.peak_date END, "
                +
                "updated_at = NOW()";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, keyword);
            ps.setString(2, status);
            ps.setDouble(3, score);
            ps.setDouble(4, velocity);
            ps.setDouble(5, wow);
            ps.setDate(6, java.sql.Date.valueOf(date));
            ps.executeUpdate();
        }
    }
}
