package com.mcp.airadar.github.dto;

import lombok.Builder;

import java.time.LocalDate;
import java.util.List;

@Builder
public record GithubOverviewDto(
        LocalDate requestedDate,
        LocalDate snapshotDate,
        int dailyWindow,
        int monthlyWindow,
        List<GithubTrendingRepoDto> repos
) {
}
