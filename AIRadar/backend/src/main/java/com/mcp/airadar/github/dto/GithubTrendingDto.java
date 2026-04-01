package com.mcp.airadar.github.dto;

import lombok.Builder;

import java.time.LocalDate;

@Builder
public record GithubTrendingDto(
        String repoId,
        String repoName,
        String description,
        String language,
        Long stars,
        Integer starDelta1d,
        LocalDate snapshotDate
) {}
