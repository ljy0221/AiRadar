package com.mcp.airadar.github.dto;

import lombok.Builder;

import java.time.LocalDate;

@Builder
public record GithubActivityPointDto(
        String label,
        LocalDate snapshotDate,
        Long stars,
        Long forks,
        Integer openIssues
) {
}
