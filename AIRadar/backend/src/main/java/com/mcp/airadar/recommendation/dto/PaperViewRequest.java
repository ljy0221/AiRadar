package com.mcp.airadar.recommendation.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record PaperViewRequest(
        @NotBlank String paperId,
        @Min(0) int dwellTimeSeconds
) {}
