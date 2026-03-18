package com.mcp.airadar.user.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record UserInterestDto(
        String keyword,
        BigDecimal weight,
        String source,
        LocalDateTime createdAt
) {}
