package com.mcp.airadar.github.dto;

import java.time.LocalDate;
import java.util.List;

public record GithubOverviewDto(
        LocalDate requestedDate,
        LocalDate snapshotDate,
        int dailyWindow,
        int monthlyWindow,
        List<GithubTrendingRepoDto> repos
) {
}
