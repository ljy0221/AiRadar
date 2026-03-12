package com.mcp.airadar.common.converter;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

/**
 * PostgreSQL TEXT[] ↔ Java String[] 변환기
 *
 * JPA는 PostgreSQL 배열 타입을 기본 지원하지 않으므로,
 * "{a,b,c}" 형식의 문자열과 String[] 간 변환을 담당한다.
 */
@Converter
public class StringArrayConverter implements AttributeConverter<String[], String> {

    @Override
    public String convertToDatabaseColumn(String[] attribute) {
        if (attribute == null || attribute.length == 0) {
            return "{}";
        }
        StringBuilder sb = new StringBuilder("{");
        for (int i = 0; i < attribute.length; i++) {
            if (i > 0) sb.append(",");
            String val = attribute[i];
            if (val == null) {
                sb.append("NULL");
            } else {
                // 쌍따옴표 및 백슬래시 이스케이프
                sb.append('"').append(val.replace("\\", "\\\\").replace("\"", "\\\"")).append('"');
            }
        }
        sb.append("}");
        return sb.toString();
    }

    @Override
    public String[] convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.equals("{}")) {
            return new String[0];
        }
        // "{a,b,c}" 또는 {"a","b","c"} 형식 파싱
        String inner = dbData.substring(1, dbData.length() - 1);
        if (inner.isBlank()) {
            return new String[0];
        }

        java.util.List<String> result = new java.util.ArrayList<>();
        int i = 0;
        while (i < inner.length()) {
            if (inner.charAt(i) == '"') {
                // 인용 문자열 파싱
                StringBuilder token = new StringBuilder();
                i++; // 여는 따옴표 건너뜀
                while (i < inner.length() && inner.charAt(i) != '"') {
                    if (inner.charAt(i) == '\\' && i + 1 < inner.length()) {
                        i++;
                        token.append(inner.charAt(i));
                    } else {
                        token.append(inner.charAt(i));
                    }
                    i++;
                }
                result.add(token.toString());
                i++; // 닫는 따옴표 건너뜀
                if (i < inner.length() && inner.charAt(i) == ',') i++;
            } else {
                // 인용 없는 값 (NULL 포함)
                int end = inner.indexOf(',', i);
                if (end == -1) end = inner.length();
                String token = inner.substring(i, end);
                result.add("NULL".equals(token) ? null : token);
                i = end + 1;
            }
        }
        return result.toArray(new String[0]);
    }
}
