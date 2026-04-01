package com.mcp.airadar.mock.dto;

public record MockMixedItemDto(
        String type,
        String id,
        String title,
        String summary,
        String category,
        String source,
        String url,
        String publishedAt
) {
}
