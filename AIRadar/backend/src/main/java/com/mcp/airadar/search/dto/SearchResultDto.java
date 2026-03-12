package com.mcp.airadar.search.dto;

public record SearchResultDto(
        String contentId,
        String contentType,
        double similarity
) {
    public static SearchResultDto from(Object[] row) {
        return new SearchResultDto(
                (String) row[0],
                (String) row[1],
                ((Number) row[2]).doubleValue()
        );
    }
}
