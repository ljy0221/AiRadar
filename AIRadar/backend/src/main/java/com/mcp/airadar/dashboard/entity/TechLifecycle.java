package com.mcp.airadar.dashboard.entity;

import com.mcp.airadar.common.converter.StringArrayConverter;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "tech_lifecycle")
public class TechLifecycle {

    @Id
    @Column(name = "keyword", length = 200)
    private String keyword;

    @Column(name = "status", length = 20)
    private String status;

    @Column(name = "peak_date")
    private LocalDate peakDate;

    @Column(name = "first_seen_date")
    private LocalDate firstSeenDate;

    @Column(name = "trend_score", precision = 8, scale = 4)
    private BigDecimal trendScore;

    @Column(name = "velocity", precision = 8, scale = 4)
    private BigDecimal velocity;

    @Column(name = "week_over_week", precision = 6, scale = 3)
    private BigDecimal weekOverWeek;

    @Convert(converter = StringArrayConverter.class)
    @Column(name = "related_keywords", columnDefinition = "TEXT[]")
    private String[] relatedKeywords;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public TechLifecycle() {}

    public String getKeyword() { return keyword; }
    public String getStatus() { return status; }
    public LocalDate getPeakDate() { return peakDate; }
    public LocalDate getFirstSeenDate() { return firstSeenDate; }
    public BigDecimal getTrendScore() { return trendScore; }
    public BigDecimal getVelocity() { return velocity; }
    public BigDecimal getWeekOverWeek() { return weekOverWeek; }
    public String[] getRelatedKeywords() { return relatedKeywords; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
