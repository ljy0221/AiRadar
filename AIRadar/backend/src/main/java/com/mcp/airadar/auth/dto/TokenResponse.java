package com.mcp.airadar.auth.dto;

public record TokenResponse(
        String accessToken,
        String refreshToken,
        String tokenType,
        boolean onboardingCompleted
) {
    public static TokenResponse of(String accessToken, String refreshToken, boolean onboardingCompleted) {
        return new TokenResponse(accessToken, refreshToken, "Bearer", onboardingCompleted);
    }
}
