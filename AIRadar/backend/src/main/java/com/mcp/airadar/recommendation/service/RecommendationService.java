package com.mcp.airadar.recommendation.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mcp.airadar.news.repository.NewsRepository;
import com.mcp.airadar.recommendation.dto.RecommendationDto;
import com.mcp.airadar.recommendation.entity.UserRecommendation;
import com.mcp.airadar.recommendation.repository.UserRecommendationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * 개인화 추천 서빙 서비스
 *
 * 서빙 우선순위:
 *   1. Redis 캐시 (TTL 30분) — 가장 빠른 응답
 *   2. Redis 유저 프로파일 기반 콘텐츠 필터링 — 키워드 매칭 + 재랭킹
 *   3. Cold start fallback — score 상위 인기 기사
 */
@Log4j2
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RecommendationService {

    private static final String REC_CACHE_KEY   = "user:%s:recommendations";
    private static final String PROFILE_KEY     = "user:%s:profile";
    private static final Duration REC_CACHE_TTL = Duration.ofMinutes(30);

    // 추천 후보 확보를 위한 배수 (페이지 크기의 N배를 DB에서 가져와 재랭킹)
    private static final int CANDIDATE_MULTIPLIER = 5;
    // 프로파일에서 추출할 상위 키워드 수
    private static final int TOP_KEYWORD_LIMIT = 10;

    private final StringRedisTemplate redisTemplate;
    private final NewsRepository newsRepository;
    private final UserRecommendationRepository userRecommendationRepository;
    private final ObjectMapper objectMapper;

    /**
     * 개인화 뉴스 추천 — 로그인 유저 전용
     *
     * @param userId 인증된 사용자 ID
     * @param size   반환할 기사 수 (최대 50)
     */
    public List<RecommendationDto.NewsItem> getPersonalizedFeed(UUID userId, int size) {
        int cappedSize = Math.min(size, 50);

        // 1. Redis 캐시 확인
        List<RecommendationDto.NewsItem> cached = getCachedRecommendations(userId);
        if (!cached.isEmpty()) {
            return cached.stream().limit(cappedSize).toList();
        }

        // 2. ALS 배치 추천 결과 조회 (유효 기간 내)
        List<UserRecommendation> alsRecs = userRecommendationRepository
                .findValidByUserId(userId, LocalDateTime.now());

        // 3. 유저 프로파일 기반 키워드 매칭 후보 조회 (최근 7일)
        List<String> topKeywords = getTopKeywordsFromProfile(userId);
        List<com.mcp.airadar.news.entity.NewsItem> keywordCandidates = List.of();
        if (!topKeywords.isEmpty()) {
            String pgArrayLiteral = toPgArrayLiteral(topKeywords);
            keywordCandidates = newsRepository.findByKeywordsOverlap(
                    pgArrayLiteral,
                    LocalDateTime.now().minusDays(7),
                    cappedSize * CANDIDATE_MULTIPLIER
            );
        }

        // ALS 결과도 키워드 후보도 없으면 Cold start fallback
        if (alsRecs.isEmpty() && keywordCandidates.isEmpty()) {
            return getColdStartFeed(cappedSize);
        }

        // 4. ALS + 키워드 매칭 결합 재랭킹
        //    ALS articleId 목록으로 DB 조회 (score 활용)
        Map<String, Double> alsScoreMap = alsRecs.stream()
                .collect(Collectors.toMap(
                        UserRecommendation::getArticleId,
                        r -> r.getScore().doubleValue(),
                        (a, b) -> a  // 중복 시 첫 번째 유지
                ));

        // 키워드 매칭 후보에 ALS 기사 추가 (중복 제거)
        Set<String> seenIds = keywordCandidates.stream()
                .map(com.mcp.airadar.news.entity.NewsItem::getArticleId)
                .collect(Collectors.toSet());

        List<com.mcp.airadar.news.entity.NewsItem> alsCandidates = List.of();
        if (!alsRecs.isEmpty()) {
            List<String> alsArticleIds = alsRecs.stream()
                    .map(UserRecommendation::getArticleId)
                    .filter(id -> !seenIds.contains(id))
                    .toList();
            if (!alsArticleIds.isEmpty()) {
                alsCandidates = newsRepository.findAllById(alsArticleIds);
            }
        }

        List<com.mcp.airadar.news.entity.NewsItem> allCandidates = new ArrayList<>(keywordCandidates);
        allCandidates.addAll(alsCandidates);

        Map<String, Double> profileWeights = getProfileKeywordWeights(userId);

        List<RecommendationDto.NewsItem> ranked = allCandidates.stream()
                .sorted((a, b) -> Double.compare(
                        calculateCombinedScore(b, profileWeights, alsScoreMap),
                        calculateCombinedScore(a, profileWeights, alsScoreMap)
                ))
                .limit(cappedSize)
                .map(item -> RecommendationDto.NewsItem.from(item,
                        alsScoreMap.containsKey(item.getArticleId()) ? "ALS" : "KEYWORD_MATCH"))
                .toList();

        // 5. 캐시 저장 (30분)
        cacheRecommendations(userId, ranked);

        return ranked;
    }

    // ─── 내부 헬퍼 ─────────────────────────────────────────────────────

    private List<RecommendationDto.NewsItem> getCachedRecommendations(UUID userId) {
        String key = REC_CACHE_KEY.formatted(userId);
        String json = redisTemplate.opsForValue().get(key);
        if (json == null) return List.of();
        try {
            return objectMapper.readValue(json, new TypeReference<>() {});
        } catch (Exception e) {
            log.warn("[Rec] 캐시 역직렬화 실패, 캐시 무효화: userId={}", userId);
            redisTemplate.delete(key);
            return List.of();
        }
    }

    private void cacheRecommendations(UUID userId, List<RecommendationDto.NewsItem> items) {
        try {
            String json = objectMapper.writeValueAsString(items);
            redisTemplate.opsForValue().set(REC_CACHE_KEY.formatted(userId), json, REC_CACHE_TTL);
        } catch (Exception e) {
            log.warn("[Rec] 캐시 저장 실패 (무시): userId={}", userId);
        }
    }

    /**
     * Redis Hash에서 "kw:" 접두사 필드를 score 내림차순으로 정렬하여 상위 키워드 반환
     */
    private List<String> getTopKeywordsFromProfile(UUID userId) {
        Map<Object, Object> profile = redisTemplate.opsForHash()
                .entries(PROFILE_KEY.formatted(userId));

        return profile.entrySet().stream()
                .filter(e -> e.getKey().toString().startsWith("kw:"))
                .sorted((a, b) -> Double.compare(
                        parseScore(b.getValue()), parseScore(a.getValue())
                ))
                .limit(TOP_KEYWORD_LIMIT)
                .map(e -> e.getKey().toString().substring(3)) // "kw:" 제거
                .toList();
    }

    /**
     * Redis Hash 전체에서 키워드 가중치 Map 반환 (재랭킹용)
     */
    private Map<String, Double> getProfileKeywordWeights(UUID userId) {
        Map<Object, Object> profile = redisTemplate.opsForHash()
                .entries(PROFILE_KEY.formatted(userId));

        return profile.entrySet().stream()
                .filter(e -> e.getKey().toString().startsWith("kw:"))
                .collect(Collectors.toMap(
                        e -> e.getKey().toString().substring(3),
                        e -> parseScore(e.getValue())
                ));
    }

    /**
     * ALS + 키워드 매칭 결합 점수 계산
     *
     * score = ALS score(0.4) + 키워드 가중치 합(0.3) + 최신성 감쇠(0.2) + AI 분석 score(0.1)
     * ALS 결과가 없는 기사는 키워드 매칭 가중치(0.5) + 최신성(0.3) + AI score(0.2)
     */
    private double calculateCombinedScore(com.mcp.airadar.news.entity.NewsItem article,
                                          Map<String, Double> profileWeights,
                                          Map<String, Double> alsScoreMap) {
        double alsScore = alsScoreMap.getOrDefault(article.getArticleId(), 0.0);
        boolean hasAls = alsScoreMap.containsKey(article.getArticleId());

        double keywordScore = 0.0;
        if (article.getKeywords() != null) {
            keywordScore = Arrays.stream(article.getKeywords())
                    .mapToDouble(kw -> profileWeights.getOrDefault(kw, 0.0))
                    .sum();
        }

        double recencyScore = 0.0;
        if (article.getPublishedAt() != null) {
            long hoursOld = Duration.between(article.getPublishedAt(), LocalDateTime.now()).toHours();
            recencyScore = Math.exp(-0.01 * hoursOld);
        }

        double qualityScore = article.getScore() != null ? article.getScore().doubleValue() : 0.5;

        if (hasAls) {
            return alsScore * 0.4 + keywordScore * 0.3 + recencyScore * 0.2 + qualityScore * 0.1;
        } else {
            return keywordScore * 0.5 + recencyScore * 0.3 + qualityScore * 0.2;
        }
    }

    private List<RecommendationDto.NewsItem> getColdStartFeed(int size) {
        return newsRepository.findTop20ByIsActiveTrueOrderByScoreDescPublishedAtDesc()
                .stream()
                .limit(size)
                .map(item -> RecommendationDto.NewsItem.from(item, "COLD_START"))
                .toList();
    }

    /** PostgreSQL TEXT[] 리터럴 변환: ["HBM","AI"] → {"HBM","AI"} */
    private String toPgArrayLiteral(List<String> keywords) {
        return "{" + keywords.stream()
                .map(kw -> "\"" + kw.replace("\"", "\\\"") + "\"")
                .collect(Collectors.joining(",")) + "}";
    }

    private double parseScore(Object value) {
        try {
            return Double.parseDouble(value.toString());
        } catch (Exception e) {
            return 0.0;
        }
    }
}
