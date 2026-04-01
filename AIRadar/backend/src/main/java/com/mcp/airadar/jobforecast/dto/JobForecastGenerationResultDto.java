package com.mcp.airadar.jobforecast.dto;

import java.time.LocalDate;
import java.util.List;

public record JobForecastGenerationResultDto(
        LocalDate forecastMonth,
        int generatedCount,
        int skippedCount,
        int failedCount,
        List<String> generatedJobs,
        List<String> skippedJobs,
        List<String> failedJobs
) {}
