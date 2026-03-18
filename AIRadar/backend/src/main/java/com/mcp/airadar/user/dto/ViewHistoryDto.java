package com.mcp.airadar.user.dto;

import java.time.LocalDateTime;

public record ViewHistoryDto(
        String articleId,
        LocalDateTime occurredAt
) {}
