package com.mcp.airadar.user.dto;

import jakarta.validation.constraints.Size;

public record UpdateProfileRequest(
        @Size(max = 100) String name,
        String currentPassword,
        @Size(min = 8) String newPassword
) {}
