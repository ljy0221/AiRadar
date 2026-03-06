package com.mcp.airader.spark.utils;

import org.apache.spark.sql.Row;

public class SparkUtils {

    private SparkUtils() {}

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
