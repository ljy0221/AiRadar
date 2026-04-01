package com.mcp.airadar.common.api;

public record ApiErrorResponse(
        boolean success,
        ApiErrorDetail error
) {
    public static ApiErrorResponse of(String code, String message, String timestamp, String path) {
        return new ApiErrorResponse(false, new ApiErrorDetail(code, message, timestamp, path));
    }

    public record ApiErrorDetail(
            String code,
            String message,
            String timestamp,
            String path
    ) {
    }
}
