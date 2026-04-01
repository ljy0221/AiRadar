package com.mcp.airadar.recommendation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SearchEventRequest(
        @NotBlank @Size(max = 500) String query
) {}
