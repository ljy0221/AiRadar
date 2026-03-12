package com.mcp.airadar.dashboard.dto;

import com.mcp.airadar.dashboard.entity.TechKeywordDaily;

import java.math.BigDecimal;
import java.time.LocalDate;

public record KeywordTrendDto(
        String keyword,
        LocalDate statDate,
        String sourceType,
        Integer mentionCount,
        Integer searchCount,
        BigDecimal avgSentiment
) {
    public static KeywordTrendDto from(TechKeywordDaily e) {
        return new KeywordTrendDto(
                e.getKeyword(),
                e.getStatDate(),
                e.getSourceType(),
                e.getMentionCount(),
                e.getSearchCount(),
                e.getAvgSentiment()
        );
    }
}
