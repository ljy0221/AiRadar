package com.mcp.airadar.github.entity;

import com.mcp.airadar.common.converter.StringArrayConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "github_repos")
public class GithubRepo {

    @Id
    @Column(name = "repo_id", length = 255)
    private String repoId;

    @Column(name = "repo_name", length = 500, nullable = false)
    private String repoName;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "language", length = 100)
    private String language;

    @Convert(converter = StringArrayConverter.class)
    @Column(name = "topics", columnDefinition = "TEXT[]")
    private String[] topics;

    @Column(name = "stars")
    private Long stars;

    @Column(name = "forks")
    private Long forks;

    @Column(name = "open_issues")
    private Integer openIssues;

    @Column(name = "weekly_commits")
    private Integer weeklyCommits;

    @Column(name = "star_delta_7d")
    private Integer starDelta7d;

    @Column(name = "ai_relevance")
    private Boolean aiRelevance;

    @Convert(converter = StringArrayConverter.class)
    @Column(name = "keywords", columnDefinition = "TEXT[]")
    private String[] keywords;

    @Column(name = "snapshot_date")
    private LocalDate snapshotDate;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public GithubRepo() {}

    public String getRepoId() { return repoId; }
    public String getRepoName() { return repoName; }
    public String getDescription() { return description; }
    public String getLanguage() { return language; }
    public String[] getTopics() { return topics; }
    public Long getStars() { return stars; }
    public Long getForks() { return forks; }
    public Integer getOpenIssues() { return openIssues; }
    public Integer getWeeklyCommits() { return weeklyCommits; }
    public Integer getStarDelta7d() { return starDelta7d; }
    public Boolean getAiRelevance() { return aiRelevance; }
    public String[] getKeywords() { return keywords; }
    public LocalDate getSnapshotDate() { return snapshotDate; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
