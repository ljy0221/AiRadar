package com.mcp.airadar.github.entity;

import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "github_repo_daily")
public class GithubRepoDaily {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "repo_id", nullable = false, length = 255)
    private String repoId;

    @Column(name = "snapshot_date", nullable = false)
    private LocalDate snapshotDate;

    @Column(name = "stars")
    private Long stars;

    @Column(name = "forks")
    private Long forks;

    @Column(name = "open_issues")
    private Integer openIssues;

    @Column(name = "weekly_commits")
    private Integer weeklyCommits;

    @Column(name = "star_delta_1d")
    private Integer starDelta1d;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    public GithubRepoDaily() {}

    public Long getId() { return id; }
    public String getRepoId() { return repoId; }
    public LocalDate getSnapshotDate() { return snapshotDate; }
    public Long getStars() { return stars; }
    public Long getForks() { return forks; }
    public Integer getOpenIssues() { return openIssues; }
    public Integer getWeeklyCommits() { return weeklyCommits; }
    public Integer getStarDelta1d() { return starDelta1d; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
