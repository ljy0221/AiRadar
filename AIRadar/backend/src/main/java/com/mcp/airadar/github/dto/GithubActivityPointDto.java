package com.mcp.airadar.github.dto;

import java.time.LocalDate;

public record GithubActivityPointDto(
        String label,
        LocalDate snapshotDate,
        Long stars,
        Long forks,
        Integer openIssues
) {
}
