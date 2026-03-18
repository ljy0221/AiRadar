package com.mcp.airadar.recommendation.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record ArticleViewRequest(
        @NotBlank String articleId,
        @Min(0) int dwellTimeSeconds
) {}
