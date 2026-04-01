package com.mcp.airadar.user.dto;

import java.time.LocalDateTime;

public record BookmarkHistoryDto(
        String articleId,
        LocalDateTime occurredAt
) {}
