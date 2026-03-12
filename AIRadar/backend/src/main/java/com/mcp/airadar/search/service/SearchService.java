package com.mcp.airadar.search.service;

import com.mcp.airadar.search.dto.SearchResultDto;
import com.mcp.airadar.search.repository.ContentEmbeddingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class SearchService {

    private final ContentEmbeddingRepository embeddingRepository;
    private final RestClient aiClient;

    private static final String AI_SERVER_URL =
            System.getenv() != null && System.getenv("AI_SERVER_URL") != null
                    ? System.getenv("AI_SERVER_URL")
                    : "http://localhost:8000";

    public SearchService(ContentEmbeddingRepository embeddingRepository) {
        this.embeddingRepository = embeddingRepository;
        this.aiClient = RestClient.builder().baseUrl(AI_SERVER_URL).build();
    }

    public List<SearchResultDto> search(String query, int limit) {
        // AI 서버에서 query embedding 생성
        float[] embedding = getQueryEmbedding(query);
        // float[] → PostgreSQL vector literal "[0.1, 0.2, ...]"
        String vectorLiteral = "[" + toCommaSeparated(embedding) + "]";
        return embeddingRepository.findSimilar(vectorLiteral, limit)
                .stream()
                .map(SearchResultDto::from)
                .collect(Collectors.toList());
    }

    private float[] getQueryEmbedding(String query) {
        record EmbedRequest(String text) {}
        record EmbedResponse(float[] embedding) {}
        EmbedResponse resp = aiClient.post()
                .uri("/embed")
                .body(new EmbedRequest(query))
                .retrieve()
                .body(EmbedResponse.class);
        if (resp == null || resp.embedding() == null) {
            throw new IllegalStateException("AI 서버로부터 임베딩을 받지 못했습니다.");
        }
        return resp.embedding();
    }

    private String toCommaSeparated(float[] arr) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < arr.length; i++) {
            if (i > 0) sb.append(',');
            sb.append(arr[i]);
        }
        return sb.toString();
    }
}
