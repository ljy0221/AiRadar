package com.mcp.airadar.dashboard.entity;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "tech_keyword_daily",
       uniqueConstraints = @UniqueConstraint(columnNames = {"keyword", "stat_date", "source_type"}))
public class TechKeywordDaily {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "keyword", length = 200, nullable = false)
    private String keyword;

    @Column(name = "stat_date", nullable = false)
    private LocalDate statDate;

    @Column(name = "source_type", length = 20)
    private String sourceType;

    @Column(name = "mention_count")
    private Integer mentionCount = 0;

    @Column(name = "search_count")
    private Integer searchCount = 0;

    @Column(name = "avg_sentiment", precision = 4, scale = 3)
    private BigDecimal avgSentiment;

    @Column(name = "commit_count")
    private Integer commitCount = 0;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public Long getId() { return id; }
    public String getKeyword() { return keyword; }
    public LocalDate getStatDate() { return statDate; }
    public String getSourceType() { return sourceType; }
    public Integer getMentionCount() { return mentionCount; }
    public Integer getSearchCount() { return searchCount; }
    public BigDecimal getAvgSentiment() { return avgSentiment; }
    public Integer getCommitCount() { return commitCount; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
