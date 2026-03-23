package com.mcp.airadar.user.dto;

import java.time.LocalDateTime;

public record LikeHistoryDto(
        String articleId,
        LocalDateTime occurredAt
) {}
