package com.mcp.airadar.spark.utils;

import org.apache.spark.sql.Row;
import org.apache.spark.sql.SparkSession;

public class SparkUtils {

    private SparkUtils() {}

    /**
     * S3A 설정 헬퍼 — MINIO_ENDPOINT 환경변수 유무로 MinIO / AWS S3 분기
     *
     * MinIO  : MINIO_ENDPOINT 설정, path.style=true, ssl=false
     * AWS S3 : endpoint 미설정, path.style=false, ssl=true
     */
    public static SparkSession.Builder configureS3A(SparkSession.Builder builder) {
        String minioEndpoint = System.getenv("MINIO_ENDPOINT");
        boolean isMinIO = minioEndpoint != null && !minioEndpoint.isEmpty();
        String accessKey = System.getenv().getOrDefault("AWS_ACCESS_KEY_ID", "minioadmin");
        String secretKey = System.getenv().getOrDefault("AWS_SECRET_ACCESS_KEY", "minioadmin123");

        builder
            .config("spark.hadoop.fs.s3a.impl", "org.apache.hadoop.fs.s3a.S3AFileSystem")
            .config("spark.hadoop.fs.s3a.access.key", accessKey)
            .config("spark.hadoop.fs.s3a.secret.key", secretKey)
            .config("spark.hadoop.fs.s3a.aws.credentials.provider",
                    "org.apache.hadoop.fs.s3a.SimpleAWSCredentialsProvider")
            .config("spark.hadoop.fs.s3a.fast.upload", "true")
            .config("spark.hadoop.fs.s3a.multipart.size", "104857600");

        if (isMinIO) {
            builder
                .config("spark.hadoop.fs.s3a.endpoint", minioEndpoint)
                .config("spark.hadoop.fs.s3a.path.style.access", "true")
                .config("spark.hadoop.fs.s3a.connection.ssl.enabled", "false");
        } else {
            builder
                .config("spark.hadoop.fs.s3a.path.style.access", "false")
                .config("spark.hadoop.fs.s3a.connection.ssl.enabled", "true");
        }
        return builder;
    }

    // -------------------------------------------------------------------------
    // 유틸
    // -------------------------------------------------------------------------

    public static String bronzePath(String sourceType, String date) {
        return System.getenv().getOrDefault("BRONZE_BASE_PATH", "/tmp/bronze")
            + "/" + sourceType + "/date=" + date;
    }

    public static String silverPath(String sourceType) {
        return System.getenv().getOrDefault("SILVER_BASE_PATH", "/tmp/silver") + "/" + sourceType;
    }

    public static String getArg(String[] args, String key) {
        for (int i = 0; i < args.length - 1; i++) {
            if (args[i].equals(key)) return args[i + 1];
        }
        return null;
    }

    public static String safeGet(Row row, String field) {
        try { return row.getAs(field); } catch (Exception e) { return null; }
    }

    public static String[] safeGetArray(Row row, String field) {
        try {
            scala.collection.Seq<?> seq = row.getAs(field);
            if (seq == null) return new String[]{};
            return scala.collection.JavaConverters.seqAsJavaList(seq)
                .stream().map(Object::toString).toArray(String[]::new);
        } catch (Exception e) { return new String[]{}; }
    }

    public static Long safeLong(Row row, String field) {
        try { return row.getAs(field); } catch (Exception e) { return null; }
    }

    public static Integer safeInt(Row row, String field) {
        try { return row.getAs(field); } catch (Exception e) { return null; }
    }
}
