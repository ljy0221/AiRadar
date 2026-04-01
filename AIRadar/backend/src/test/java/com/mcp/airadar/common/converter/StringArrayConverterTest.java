package com.mcp.airadar.common.converter;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class StringArrayConverterTest {

    private StringArrayConverter converter;

    @BeforeEach
    void setUp() {
        converter = new StringArrayConverter();
    }

    // ─── convertToDatabaseColumn ──────────────────────────────────────────────

    @Test
    @DisplayName("null 입력 → '{}'")
    void toDatabaseColumn_null() {
        assertThat(converter.convertToDatabaseColumn(null)).isEqualTo("{}");
    }

    @Test
    @DisplayName("빈 배열 → '{}'")
    void toDatabaseColumn_empty() {
        assertThat(converter.convertToDatabaseColumn(new String[0])).isEqualTo("{}");
    }

    @Test
    @DisplayName("단일 원소 → '{\"a\"}'")
    void toDatabaseColumn_singleElement() {
        assertThat(converter.convertToDatabaseColumn(new String[]{"a"})).isEqualTo("{\"a\"}");
    }

    @Test
    @DisplayName("복수 원소 → '{\"a\",\"b\",\"c\"}'")
    void toDatabaseColumn_multipleElements() {
        assertThat(converter.convertToDatabaseColumn(new String[]{"a", "b", "c"}))
                .isEqualTo("{\"a\",\"b\",\"c\"}");
    }

    @Test
    @DisplayName("쌍따옴표 포함 값 → 이스케이프 처리")
    void toDatabaseColumn_escapesQuotes() {
        String[] input = new String[]{"say \"hello\""};
        String result = converter.convertToDatabaseColumn(input);
        assertThat(result).isEqualTo("{\"say \\\"hello\\\"\"}");
    }

    @Test
    @DisplayName("배열 내 null → NULL 리터럴")
    void toDatabaseColumn_nullElement() {
        String[] input = new String[]{"a", null, "c"};
        assertThat(converter.convertToDatabaseColumn(input)).isEqualTo("{\"a\",NULL,\"c\"}");
    }

    // ─── convertToEntityAttribute ─────────────────────────────────────────────

    @Test
    @DisplayName("null DB 데이터 → 빈 배열")
    void toEntityAttribute_null() {
        assertThat(converter.convertToEntityAttribute(null)).isEmpty();
    }

    @Test
    @DisplayName("'{}' → 빈 배열")
    void toEntityAttribute_emptyBraces() {
        assertThat(converter.convertToEntityAttribute("{}")).isEmpty();
    }

    @Test
    @DisplayName("인용 형식 '{\"a\",\"b\"}' → [\"a\", \"b\"]")
    void toEntityAttribute_quotedValues() {
        String[] result = converter.convertToEntityAttribute("{\"a\",\"b\"}");
        assertThat(result).containsExactly("a", "b");
    }

    @Test
    @DisplayName("인용 없는 형식 '{a,b,c}' → [\"a\", \"b\", \"c\"]")
    void toEntityAttribute_unquotedValues() {
        String[] result = converter.convertToEntityAttribute("{a,b,c}");
        assertThat(result).containsExactly("a", "b", "c");
    }

    @Test
    @DisplayName("NULL 리터럴 포함 → null 원소")
    void toEntityAttribute_nullLiteral() {
        String[] result = converter.convertToEntityAttribute("{\"a\",NULL,\"c\"}");
        assertThat(result).hasSize(3);
        assertThat(result[0]).isEqualTo("a");
        assertThat(result[1]).isNull();
        assertThat(result[2]).isEqualTo("c");
    }

    @Test
    @DisplayName("이스케이프된 쌍따옴표 → 원본 복원")
    void toEntityAttribute_unescapesQuotes() {
        String[] result = converter.convertToEntityAttribute("{\"say \\\"hello\\\"\"}");
        assertThat(result).containsExactly("say \"hello\"");
    }

    @Test
    @DisplayName("왕복 변환 일관성 확인")
    void roundTrip() {
        String[] original = {"RAG", "LLM", "Vector DB"};
        String dbValue = converter.convertToDatabaseColumn(original);
        String[] restored = converter.convertToEntityAttribute(dbValue);
        assertThat(restored).containsExactly(original);
    }
}
