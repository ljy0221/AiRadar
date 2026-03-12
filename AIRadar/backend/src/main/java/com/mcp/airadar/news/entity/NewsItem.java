package com.mcp.airadar.news.entity;

import com.mcp.airadar.common.converter.StringArrayConverter;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "news_items")
public class NewsItem {

    @Id
    @Column(name = "article_id", length = 255)
    private String articleId;

    @Column(name = "title", nullable = false, columnDefinition = "TEXT")
    private String title;

    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    @Column(name = "url", length = 1000)
    private String url;

    @Column(name = "source", length = 100)
    private String source;

    @Column(name = "country_code", length = 2)
    private String countryCode;

    @Column(name = "region", length = 10)
    private String region;

    @Column(name = "sentiment", length = 20)
    private String sentiment;

    @Convert(converter = StringArrayConverter.class)
    @Column(name = "keywords", columnDefinition = "TEXT[]")
    private String[] keywords;

    @Column(name = "score", precision = 5, scale = 4)
    private BigDecimal score;

    @Column(name = "summary", columnDefinition = "TEXT")
    private String summary;

    @Column(name = "category", length = 50)
    private String category;

    @Column(name = "view_count")
    private Long viewCount = 0L;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    @Column(name = "analyzed_at")
    private LocalDateTime analyzedAt;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "is_active")
    private Boolean isActive = true;

    public String getArticleId() { return articleId; }
    public String getTitle() { return title; }
    public String getContent() { return content; }
    public String getUrl() { return url; }
    public String getSource() { return source; }
    public String getCountryCode() { return countryCode; }
    public String getRegion() { return region; }
    public String getSentiment() { return sentiment; }
    public String[] getKeywords() { return keywords; }
    public BigDecimal getScore() { return score; }
    public String getSummary() { return summary; }
    public String getCategory() { return category; }
    public Long getViewCount() { return viewCount; }
    public LocalDateTime getPublishedAt() { return publishedAt; }
    public LocalDateTime getAnalyzedAt() { return analyzedAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public Boolean getIsActive() { return isActive; }
}
