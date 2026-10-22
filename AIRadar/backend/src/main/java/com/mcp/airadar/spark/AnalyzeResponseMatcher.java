package com.mcp.airadar.spark;

import com.fasterxml.jackson.databind.JsonNode;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.BiFunction;
import java.util.function.Function;

/**
 * ai-server 배치 분석 응답을 요청 레코드와 id로 짝짓는다.
 *
 * <p>LLM은 항목을 빠뜨리거나 순서를 바꾸거나 없는 id를 만들어낼 수 있으므로 응답을 인덱스로 짝지으면
 * 다른 레코드의 원본 필드(title, url 등)가 섞인다. 요청 순서대로 결과를 만들고, 응답에 없는 레코드는
 * 조용히 사라지지 않도록 onMissing으로 넘겨 error_log에 남긴다.
 *
 * <p>Spark 타입에 의존하지 않아 Spark 없이 단위 테스트할 수 있다.
 */
final class AnalyzeResponseMatcher {

    static final String MISSING_RESULT_MESSAGE = "AI 분석 결과 누락";

    private AnalyzeResponseMatcher() {
    }

    static <T, R> List<R> matchById(
            List<T> requests,
            Function<T, String> requestId,
            JsonNode response,
            String idField,
            BiFunction<JsonNode, T, R> onMatch,
            Function<T, R> onMissing) {

        Map<String, JsonNode> responseById = new HashMap<>();
        if (response != null && response.isArray()) {
            for (JsonNode item : response) {
                JsonNode id = item.get(idField);
                if (id != null && !id.isNull()) {
                    responseById.putIfAbsent(id.asText(), item);
                }
            }
        }

        List<R> result = new ArrayList<>(requests.size());
        for (T request : requests) {
            JsonNode item = responseById.get(requestId.apply(request));
            result.add(item != null ? onMatch.apply(item, request) : onMissing.apply(request));
        }
        return result;
    }
}
