package com.mcp.airadar.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AddInterestRequest(
        @NotBlank @Size(max = 100) String keyword
) {}
