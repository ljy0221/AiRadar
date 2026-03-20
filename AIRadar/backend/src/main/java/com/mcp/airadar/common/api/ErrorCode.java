package com.mcp.airadar.common.api;

import org.springframework.http.HttpStatus;

public enum ErrorCode {
    INVALID_INPUT_VALUE(HttpStatus.BAD_REQUEST, "COMMON_001", "올바르지 않은 입력값입니다."),
    METHOD_NOT_ALLOWED(HttpStatus.METHOD_NOT_ALLOWED, "COMMON_002", "지원하지 않는 HTTP 메서드입니다."),
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "COMMON_003", "서버 내부 오류가 발생했습니다."),
    INVALID_TYPE_VALUE(HttpStatus.BAD_REQUEST, "COMMON_004", "올바르지 않은 타입 값입니다."),
    RESOURCE_NOT_FOUND(HttpStatus.NOT_FOUND, "COMMON_005", "요청한 리소스를 찾을 수 없습니다."),
    INVALID_REQUEST(HttpStatus.BAD_REQUEST, "COMMON_006", "잘못된 요청입니다."),
    ACCESS_DENIED(HttpStatus.FORBIDDEN, "COMMON_007", "접근 권한이 없습니다."),

    INVALID_COMPANY_ACTIVITY_QUERY(HttpStatus.BAD_REQUEST, "COMPANY_001", "limit/sort 값이 올바르지 않습니다."),
    INVALID_NEWSLETTER_UNSUBSCRIBE_TOKEN(HttpStatus.BAD_REQUEST, "MAIL_001", "유효하지 않은 뉴스레터 해지 토큰입니다.");

    private final HttpStatus httpStatus;
    private final String code;
    private final String message;

    ErrorCode(HttpStatus httpStatus, String code, String message) {
        this.httpStatus = httpStatus;
        this.code = code;
        this.message = message;
    }

    public HttpStatus getHttpStatus() {
        return httpStatus;
    }

    public String getCode() {
        return code;
    }

    public String getMessage() {
        return message;
    }
}
