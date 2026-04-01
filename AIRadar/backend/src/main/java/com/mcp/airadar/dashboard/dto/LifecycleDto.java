package com.mcp.airadar.dashboard.dto;

import com.mcp.airadar.dashboard.entity.TechLifecycle;

import java.math.BigDecimal;
import java.time.LocalDate;

public record LifecycleDto(
        String keyword,
        String status,
        LocalDate peakDate,
        LocalDate firstSeenDate,
        BigDecimal trendScore,
        BigDecimal velocity,
        BigDecimal weekOverWeek,
        String[] relatedKeywords
) {
    public static LifecycleDto from(TechLifecycle e) {
        return new LifecycleDto(
                e.getKeyword(),
                e.getStatus(),
                e.getPeakDate(),
                e.getFirstSeenDate(),
                e.getTrendScore(),
                e.getVelocity(),
                e.getWeekOverWeek(),
                e.getRelatedKeywords()
        );
    }
}
