package com.mcp.airadar.user.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record UserProfileDto(
        UUID userId,
        String email,
        String name,
        LocalDateTime createdAt
) {}
