package com.mcp.airadar.jobforecast.entity;

import java.util.Arrays;

public enum JobRoleType {
    DEVELOPER(1L, "developer", "개발자"),
    MARKETER(2L, "marketer", "마케터"),
    ADMIN_ASSISTANT(3L, "admin-assistant", "행정 보조"),
    INTERPRETER(4L, "interpreter", "통역사"),
    CUSTOMER_SUPPORT(5L, "customer-support", "고객 상담원"),
    LAWYER(6L, "lawyer", "변호사"),
    ACCOUNTANT(7L, "accountant", "회계사"),
    COUNSELOR(8L, "counselor", "심리상담사"),
    FASHION_DESIGNER(9L, "fashion-designer", "패션 디자이너"),
    POLICE_OFFICER(10L, "police-officer", "경찰관");

    private final Long dbId;
    private final String code;
    private final String displayName;

    JobRoleType(Long dbId, String code, String displayName) {
        this.dbId = dbId;
        this.code = code;
        this.displayName = displayName;
    }

    public Long getDbId() {
        return dbId;
    }

    public String getCode() {
        return code;
    }

    public String getDisplayName() {
        return displayName;
    }

    public static JobRoleType fromCode(String code) {
        return Arrays.stream(values())
                .filter(value -> value.code.equals(code))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unsupported jobCode: " + code));
    }
}
