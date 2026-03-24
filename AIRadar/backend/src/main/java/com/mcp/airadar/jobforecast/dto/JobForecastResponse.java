package com.mcp.airadar.jobforecast.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record JobForecastResponse(
        String jobCode,
        String jobName,
        LocalDate forecastMonth,
        LocalDateTime generatedAt,
        LocalDateTime expiresAt,
        boolean stale,
        String modelName,
        String promptVersion,
        List<TaskForecast> tasks
) {
    public record TaskForecast(
            String taskKey,
            String taskTitle,
            String taskDescription,
            String impactSummary,
            DetailedScenario detailedScenario,
            List<String> humanStrengths,
            List<String> recommendedSkills,
            List<String> promisingTools,
            Evidence evidence
    ) {}

    public record DetailedScenario(
            List<String> steps,
            String automationEffect
    ) {}

    public record Evidence(
            PaperEvidence paper,
            NewsEvidence news
    ) {}

    public record PaperEvidence(
            String level,
            String note
    ) {}

    public record NewsEvidence(
            Integer count,
            String note
    ) {}
}
