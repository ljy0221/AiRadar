package com.mcp.airader.spark.models;

import org.apache.spark.sql.types.DataTypes;
import org.apache.spark.sql.types.StructField;
import org.apache.spark.sql.types.StructType;

public class SilverSchemas {
    // Silver 스키마: news
    public static final StructType NEWS_SILVER_SCHEMA = DataTypes.createStructType(new StructField[]{
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

    // Silver 스키마: paper
    public static final StructType PAPER_SILVER_SCHEMA = DataTypes.createStructType(new StructField[]{
        DataTypes.createStructField("paper_id",      DataTypes.StringType,   false),
        DataTypes.createStructField("title",         DataTypes.StringType,   true),
        DataTypes.createStructField("abstract",      DataTypes.StringType,   true),
        DataTypes.createStructField("url",           DataTypes.StringType,   true),
        DataTypes.createStructField("source",        DataTypes.StringType,   true),
        DataTypes.createStructField("authors",       DataTypes.createArrayType(DataTypes.StringType), true),
        DataTypes.createStructField("published_at",  DataTypes.StringType,   true),
        DataTypes.createStructField("keywords",      DataTypes.createArrayType(DataTypes.StringType), true),
        DataTypes.createStructField("summary",       DataTypes.StringType,   true),
        DataTypes.createStructField("category",      DataTypes.StringType,   true),
        DataTypes.createStructField("research_area", DataTypes.StringType,   true),
        DataTypes.createStructField("error_log",     DataTypes.StringType,   true),
        DataTypes.createStructField("batch_date",    DataTypes.DateType,     false),
    });

    // Silver 스키마: github
    public static final StructType GITHUB_SILVER_SCHEMA = DataTypes.createStructType(new StructField[]{
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
}
