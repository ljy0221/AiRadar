package com.mcp.airadar.github.dto;

import lombok.Builder;

import java.util.List;

@Builder
public record GithubTrendingRepoDto(
        String repoId,
        String repoName,
        String description,
        String language,
        Long stars,
        Long forks,
        Integer weeklyCommits,
        Integer starDelta7d,
        List<GithubActivityPointDto> daily,
        List<GithubActivityPointDto> monthly
) {
}
