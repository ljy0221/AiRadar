package com.mcp.airadar.recommendation.dto;

import jakarta.validation.constraints.NotBlank;

public record ArticleActionRequest(
        @NotBlank String articleId
) {}
