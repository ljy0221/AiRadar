package com.mcp.airadar.dashboard.dto;

import java.util.List;

public record WordCloudDto(
        String keyword,
        int count,
        String sourceType,
        List<SimilarKeywordDto> similarKeywords,
        String clusterKey
) {
}
