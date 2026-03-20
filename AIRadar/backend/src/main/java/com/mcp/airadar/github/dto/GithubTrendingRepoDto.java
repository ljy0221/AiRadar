package com.mcp.airadar.github.dto;

import java.util.List;

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
