package com.mcp.airadar.github.dto;

import java.time.LocalDate;

public record GithubTrendingDto(
        String repoId,
        String repoName,
        String description,
        String language,
        Long stars,
        Integer starDelta1d,
        LocalDate snapshotDate
) {}
