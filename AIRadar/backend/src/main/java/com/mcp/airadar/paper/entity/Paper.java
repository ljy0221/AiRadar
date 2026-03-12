package com.mcp.airadar.paper.entity;

import com.mcp.airadar.common.converter.StringArrayConverter;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "papers")
public class Paper {

    @Id
    @Column(name = "paper_id", length = 255)
    private String paperId;

    @Column(name = "title", nullable = false, columnDefinition = "TEXT")
    private String title;

    @Column(name = "abstract", columnDefinition = "TEXT")
    private String abstractText;

    @Column(name = "url", length = 1000)
    private String url;

    @Column(name = "source", length = 50)
    private String source;

    @Convert(converter = StringArrayConverter.class)
    @Column(name = "authors", columnDefinition = "TEXT[]")
    private String[] authors;

    @Column(name = "research_area", length = 100)
    private String researchArea;

    @Convert(converter = StringArrayConverter.class)
    @Column(name = "keywords", columnDefinition = "TEXT[]")
    private String[] keywords;

    @Column(name = "summary", columnDefinition = "TEXT")
    private String summary;

    @Column(name = "category", length = 50)
    private String category;

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

    public String getPaperId() { return paperId; }
    public String getTitle() { return title; }
    public String getAbstractText() { return abstractText; }
    public String getUrl() { return url; }
    public String getSource() { return source; }
    public String[] getAuthors() { return authors; }
    public String getResearchArea() { return researchArea; }
    public String[] getKeywords() { return keywords; }
    public String getSummary() { return summary; }
    public String getCategory() { return category; }
    public LocalDateTime getPublishedAt() { return publishedAt; }
    public LocalDateTime getAnalyzedAt() { return analyzedAt; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public Boolean getIsActive() { return isActive; }
}
