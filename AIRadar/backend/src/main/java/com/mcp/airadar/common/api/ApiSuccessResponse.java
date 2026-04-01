package com.mcp.airadar.common.api;

public record ApiSuccessResponse<T>(
        boolean success,
        String code,
        String message,
        String path,
        T data
) {
    public static <T> ApiSuccessResponse<T> of(String path, T data) {
        return new ApiSuccessResponse<>(true, "SUCCESS", "성공입니다.", path, data);
    }
}
