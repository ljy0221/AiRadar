package com.mcp.airadar.spark;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class AnalyzeResponseMatcherTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();

    /** 요청 레코드: id와 원본 제목. 결과에 원본 제목이 붙으므로 다른 레코드와 섞이면 바로 드러난다. */
    private record Req(String id, String title) {
    }

    private static List<String> match(List<Req> requests, String responseJson) throws Exception {
        JsonNode response = MAPPER.readTree(responseJson);
        return AnalyzeResponseMatcher.matchById(
            requests,
            Req::id,
            response,
            "article_id",
            (item, req) -> item.get("article_id").asText() + ":" + req.title() + ":" + item.get("summary").asText(),
            req -> req.id() + ":ERROR"
        );
    }

    private static final List<Req> REQUESTS = List.of(
        new Req("a1", "title-a1"),
        new Req("a2", "title-a2"),
        new Req("a3", "title-a3")
    );

    @Test
    @DisplayName("given reordered response when match then pairs each request with its own result in request order")
    void matchesByIdInRequestOrder() throws Exception {
        List<String> result = match(REQUESTS, """
            [{"article_id":"a3","summary":"s3"},{"article_id":"a1","summary":"s1"},{"article_id":"a2","summary":"s2"}]
            """);

        assertThat(result).containsExactly("a1:title-a1:s1", "a2:title-a2:s2", "a3:title-a3:s3");
    }

    @Test
    @DisplayName("given dropped item when match then marks it missing and later records stay aligned")
    void missingResultBecomesErrorWithoutShifting() throws Exception {
        List<String> result = match(REQUESTS, """
            [{"article_id":"a1","summary":"s1"},{"article_id":"a3","summary":"s3"}]
            """);

        assertThat(result).containsExactly("a1:title-a1:s1", "a2:ERROR", "a3:title-a3:s3");
    }

    @Test
    @DisplayName("given unknown, duplicate or absent ids when match then ignores them")
    void ignoresUnknownAndDuplicateIds() throws Exception {
        List<String> result = match(REQUESTS, """
            [{"article_id":"zz","summary":"x"},{"article_id":"a1","summary":"first"},
             {"article_id":"a1","summary":"dup"},{"summary":"no-id"},{"article_id":null,"summary":"null-id"}]
            """);

        assertThat(result).containsExactly("a1:title-a1:first", "a2:ERROR", "a3:ERROR");
    }

    @Test
    @DisplayName("given empty or non-array response when match then marks every request missing")
    void emptyOrNonArrayResponseMarksAllMissing() throws Exception {
        assertThat(match(REQUESTS, "[]")).containsExactly("a1:ERROR", "a2:ERROR", "a3:ERROR");
        assertThat(match(REQUESTS, "{\"detail\":\"error\"}")).containsExactly("a1:ERROR", "a2:ERROR", "a3:ERROR");
    }

    @Test
    @DisplayName("given any response when match then result size equals request size")
    void resultSizeAlwaysEqualsRequestSize() throws Exception {
        List<Req> one = List.of(new Req("a1", "t"));
        String moreThanRequested = """
            [{"article_id":"a1","summary":"s"},{"article_id":"a2","summary":"s"},{"article_id":"a3","summary":"s"}]
            """;

        assertThat(match(one, moreThanRequested)).hasSize(1);
        assertThat(match(REQUESTS, "[]")).hasSize(REQUESTS.size());
    }
}
