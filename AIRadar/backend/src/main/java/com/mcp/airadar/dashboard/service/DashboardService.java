package com.mcp.airadar.dashboard.service;

import com.mcp.airadar.dashboard.dto.JobRiskDto;
import com.mcp.airadar.dashboard.dto.KeywordTrendDto;
import com.mcp.airadar.dashboard.dto.LifecycleDto;
import com.mcp.airadar.dashboard.dto.SimilarKeywordDto;
import com.mcp.airadar.dashboard.repository.JobAiRiskRepository;
import com.mcp.airadar.dashboard.repository.KeywordEmbeddingRepository;
import com.mcp.airadar.dashboard.repository.TechKeywordDailyRepository;
import com.mcp.airadar.dashboard.repository.TechLifecycleRepository;
import com.mcp.airadar.dashboard.dto.WordCloudDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.time.LocalDate;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class DashboardService {

    private static final Logger log = LoggerFactory.getLogger(DashboardService.class);
    private static final double SIMILARITY_THRESHOLD = 0.72;

    private final TechKeywordDailyRepository keywordDailyRepository;
    private final TechLifecycleRepository lifecycleRepository;
    private final JobAiRiskRepository jobAiRiskRepository;
    private final KeywordEmbeddingRepository keywordEmbeddingRepository;
    private final RestClient aiClient;

    public DashboardService(TechKeywordDailyRepository keywordDailyRepository,
                            TechLifecycleRepository lifecycleRepository,
                            JobAiRiskRepository jobAiRiskRepository,
                            KeywordEmbeddingRepository keywordEmbeddingRepository) {
        this.keywordDailyRepository = keywordDailyRepository;
        this.lifecycleRepository = lifecycleRepository;
        this.jobAiRiskRepository = jobAiRiskRepository;
        this.keywordEmbeddingRepository = keywordEmbeddingRepository;
        String aiServerUrl = System.getenv("AI_SERVER_URL") != null
                ? System.getenv("AI_SERVER_URL")
                : "http://localhost:8000";
        this.aiClient = RestClient.builder().baseUrl(aiServerUrl).build();
    }

    public List<KeywordTrendDto> getKeywordTrends(LocalDate date) {
        LocalDate targetDate = (date != null) ? date : LocalDate.now();
        return keywordDailyRepository.findByStatDateOrderByMentionCountDesc(targetDate)
                .stream()
                .limit(10)
                .map(KeywordTrendDto::from)
                .toList();
    }

    public List<LifecycleDto> getLifecycle(String status) {
        if (status != null) {
            return lifecycleRepository.findByStatusOrderByTrendScoreDesc(status)
                    .stream().map(LifecycleDto::from).toList();
        }
        return lifecycleRepository.findAllByOrderByTrendScoreDesc()
                .stream().map(LifecycleDto::from).toList();
    }

    public List<JobRiskDto> getJobRisks() {
        return jobAiRiskRepository.findAllByOrderByRiskScoreDesc()
                .stream().map(JobRiskDto::from).toList();
    }

    public List<WordCloudDto> getWordCloud(String sourceType, int limit) {
        List<WordCloudDto> baseWords = keywordDailyRepository.findTopKeywordsByLatestWeekAndSourceType(sourceType, limit)
                .stream()
                .map(obj -> new WordCloudDto(
                        (String) obj[0],
                        ((Number) obj[1]).intValue(),
                        sourceType,
                        List.of(),
                        (String) obj[0]
                ))
                .toList();

        if (baseWords.isEmpty()) {
            return baseWords;
        }

        try {
            List<String> keywords = baseWords.stream().map(WordCloudDto::keyword).toList();
            Set<String> keywordSet = new HashSet<>(keywords);
            syncMissingKeywordEmbeddings(sourceType, keywords);

            Map<String, List<SimilarKeywordDto>> similarKeywordMap = new HashMap<>();
            for (String keyword : keywords) {
                List<SimilarKeywordDto> matchedKeywords = keywordEmbeddingRepository.findSimilarKeywords(
                                sourceType,
                                keyword,
                                keywords.size(),
                                SIMILARITY_THRESHOLD
                        ).stream()
                        .filter(similarKeyword -> keywordSet.contains(similarKeyword.keyword()))
                        .toList();
                similarKeywordMap.put(
                        keyword,
                        matchedKeywords
                );
            }

            Map<String, String> clusterMap = buildClusterMap(keywords, similarKeywordMap);

            return baseWords.stream()
                    .map(word -> new WordCloudDto(
                            word.keyword(),
                            word.count(),
                            word.sourceType(),
                            similarKeywordMap.getOrDefault(word.keyword(), List.of()),
                            clusterMap.getOrDefault(word.keyword(), word.keyword())
                    ))
                    .toList();
        } catch (Exception e) {
            log.warn("Word cloud similarity enrichment skipped for sourceType={}", sourceType, e);
            return baseWords;
        }
    }

    private void syncMissingKeywordEmbeddings(String sourceType, List<String> keywords) {
        Set<String> existingKeywords = keywordEmbeddingRepository.findExistingKeywords(sourceType, keywords);
        List<String> missingKeywords = keywords.stream()
                .filter(keyword -> !existingKeywords.contains(keyword))
                .toList();

        if (missingKeywords.isEmpty()) {
            return;
        }

        List<List<Float>> embeddings = getKeywordEmbeddings(missingKeywords);
        if (embeddings.size() != missingKeywords.size()) {
            throw new IllegalStateException("Keyword embedding count mismatch");
        }

        List<KeywordEmbeddingRepository.KeywordEmbeddingUpsert> items = new ArrayList<>();
        for (int i = 0; i < missingKeywords.size(); i++) {
            items.add(new KeywordEmbeddingRepository.KeywordEmbeddingUpsert(
                    missingKeywords.get(i),
                    toVectorLiteral(embeddings.get(i))
            ));
        }
        keywordEmbeddingRepository.upsert(sourceType, items);
    }

    private List<List<Float>> getKeywordEmbeddings(List<String> keywords) {
        record EmbedBatchRequest(List<String> texts) {}
        record EmbedBatchResponse(List<List<Float>> embeddings) {}

        EmbedBatchResponse response = aiClient.post()
                .uri("/embed/batch")
                .body(new EmbedBatchRequest(keywords))
                .retrieve()
                .body(EmbedBatchResponse.class);

        if (response == null || response.embeddings() == null) {
            throw new IllegalStateException("AI server returned no keyword embeddings");
        }
        return response.embeddings();
    }

    private Map<String, String> buildClusterMap(List<String> keywords, Map<String, List<SimilarKeywordDto>> similarKeywordMap) {
        Map<String, Set<String>> graph = new HashMap<>();
        Set<String> keywordSet = new HashSet<>(keywords);

        for (String keyword : keywords) {
            graph.computeIfAbsent(keyword, ignored -> new HashSet<>());
            for (SimilarKeywordDto similarKeyword : similarKeywordMap.getOrDefault(keyword, List.of())) {
                if (!keywordSet.contains(similarKeyword.keyword())) {
                    continue;
                }
                graph.get(keyword).add(similarKeyword.keyword());
                graph.computeIfAbsent(similarKeyword.keyword(), ignored -> new HashSet<>()).add(keyword);
            }
        }

        Map<String, String> clusterMap = new HashMap<>();
        Set<String> visited = new HashSet<>();

        for (String start : keywords) {
            if (!visited.add(start)) {
                continue;
            }

            List<String> component = new ArrayList<>();
            ArrayDeque<String> queue = new ArrayDeque<>();
            queue.add(start);

            while (!queue.isEmpty()) {
                String current = queue.poll();
                component.add(current);
                for (String neighbor : graph.getOrDefault(current, Set.of())) {
                    if (visited.add(neighbor)) {
                        queue.add(neighbor);
                    }
                }
            }

            String clusterKey = component.stream()
                    .sorted(Comparator.comparingInt((String keyword) ->
                                    similarKeywordMap.getOrDefault(keyword, List.of()).size())
                            .reversed()
                            .thenComparing(String::compareTo))
                    .findFirst()
                    .orElse(start);

            for (String keyword : component) {
                clusterMap.put(keyword, clusterKey);
            }
        }

        return clusterMap;
    }

    private String toVectorLiteral(List<Float> embedding) {
        return embedding.stream()
                .map(String::valueOf)
                .collect(Collectors.joining(",", "[", "]"));
    }
}
