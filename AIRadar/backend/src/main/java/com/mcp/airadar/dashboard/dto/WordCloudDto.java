package com.mcp.airadar.dashboard.dto;

public record WordCloudDto(
        String keyword,
        int count,
        String sourceType
) {
}
