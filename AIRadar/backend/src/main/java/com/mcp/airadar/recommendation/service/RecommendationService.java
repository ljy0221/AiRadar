package com.mcp.airadar.recommendation.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mcp.airadar.news.repository.NewsRepository;
import com.mcp.airadar.paper.repository.PaperRepository;
import com.mcp.airadar.recommendation.dto.RecommendationDto;
import com.mcp.airadar.recommendation.entity.UserRecommendation;
import com.mcp.airadar.recommendation.repository.UserRecommendationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.redis.core.script.DefaultRedisScript;
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

    private static final Duration REC_CACHE_TTL      = Duration.ofMinutes(30);

    /**
     * 프로파일 revision이 계산 시작 시점과 같을 때만 캐시에 저장한다 (확인과 저장을 Redis 안에서 원자적으로 수행).
     * 스크립트 본문은 resources/redis/cache_if_profile_unchanged.lua에 있다 (인자 규약은 파일 주석 참고).
     * 스크립트를 고쳤다면 src/test/resources/redis/verify_cache_if_profile_unchanged.py로 동작을 다시 검증해야 한다.
     * 두 키가 같은 노드에 있어야 하므로 Redis Cluster에서는 해시 태그가 필요하다 (현재는 단일 노드 구성).
     */
    static final DefaultRedisScript<Long> CACHE_IF_PROFILE_UNCHANGED = cacheIfProfileUnchangedScript();

    private static DefaultRedisScript<Long> cacheIfProfileUnchangedScript() {
        DefaultRedisScript<Long> script = new DefaultRedisScript<>();
        script.setLocation(new ClassPathResource("redis/cache_if_profile_unchanged.lua"));
        script.setResultType(Long.class);
        return script;
    }

    // 추천 후보 확보를 위한 배수 (페이지 크기의 N배를 DB에서 가져와 재랭킹)
    private static final int CANDIDATE_MULTIPLIER = 5;
    // 프로파일에서 추출할 상위 키워드 수
    private static final int TOP_KEYWORD_LIMIT = 10;

    private final StringRedisTemplate redisTemplate;
    private final NewsRepository newsRepository;
    private final PaperRepository paperRepository;
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

        // 프로파일은 한 번만 읽고, 계산 시작 시점의 revision을 기억해 둔다 (캐시 저장 직전 비교용)
        Map<Object, Object> profile = getProfile(userId);
        Object revisionBefore = profile.get(RecommendationCacheKeys.PROFILE_REVISION_FIELD);

        // 2. ALS 배치 추천 결과 조회 (유효 기간 내)
        List<UserRecommendation> alsRecs = userRecommendationRepository
                .findValidByUserId(userId, LocalDateTime.now());

        // 3. 이미 본 기사 ID 수집 (art: 접두사 필드)
        Set<String> viewedArticleIds = getViewedArticleIds(profile);

        // 4. 유저 프로파일 기반 키워드 매칭 후보 조회 (최근 7일)
        List<String> topKeywords = getTopKeywordsFromProfile(profile);
        List<com.mcp.airadar.news.entity.NewsItem> keywordCandidates = List.of();
        if (!topKeywords.isEmpty()) {
            String pgArrayLiteral = toPgArrayLiteral(topKeywords);
            keywordCandidates = newsRepository.findByKeywordsOverlap(
                    pgArrayLiteral,
                    LocalDateTime.now().minusDays(7),
                    cappedSize * CANDIDATE_MULTIPLIER
            ).stream()
                    .filter(a -> !viewedArticleIds.contains(a.getArticleId()))
                    .toList();
        }

        // ALS 결과도 키워드 후보도 없으면 Cold start fallback
        if (alsRecs.isEmpty() && keywordCandidates.isEmpty()) {
            return getColdStartFeed(cappedSize, viewedArticleIds);
        }

        // 5. ALS + 키워드 매칭 결합 재랭킹
        //    ALS articleId 목록으로 DB 조회 (score 활용), 이미 본 기사 제외
        Map<String, Double> alsScoreMap = alsRecs.stream()
                .filter(r -> !viewedArticleIds.contains(r.getArticleId()))
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
            List<String> alsArticleIds = alsScoreMap.keySet().stream()
                    .filter(id -> !seenIds.contains(id))
                    .toList();
            if (!alsArticleIds.isEmpty()) {
                alsCandidates = newsRepository.findAllById(alsArticleIds);
            }
        }

        List<com.mcp.airadar.news.entity.NewsItem> allCandidates = new ArrayList<>(keywordCandidates);
        allCandidates.addAll(alsCandidates);

        // 필터 후 후보가 없으면 Cold start fallback
        if (allCandidates.isEmpty()) {
            return getColdStartFeed(cappedSize, viewedArticleIds);
        }

        Map<String, Double> profileWeights = getProfileKeywordWeights(profile);

        List<RecommendationDto.NewsItem> ranked = allCandidates.stream()
                .sorted((a, b) -> Double.compare(
                        calculateCombinedScore(b, profileWeights, alsScoreMap),
                        calculateCombinedScore(a, profileWeights, alsScoreMap)
                ))
                .limit(cappedSize)
                .map(item -> RecommendationDto.NewsItem.from(item,
                        alsScoreMap.containsKey(item.getArticleId()) ? "ALS" : "KEYWORD_MATCH"))
                .toList();

        // 6. 캐시 저장 (30분) — 계산 중 프로파일이 바뀌었으면 stale 결과이므로 저장하지 않는다
        cacheRecommendations(userId, ranked, revisionBefore);

        return ranked;
    }

    /**
     * 개인화 논문 추천 — 로그인 유저 전용
     *
     * 서빙 우선순위:
     *   1. Redis 캐시 (TTL 30분)
     *   2. Redis 유저 프로파일 키워드 매칭 (최근 30일 논문)
     *   3. Cold start fallback — 최신 논문 인기순
     */
    public List<RecommendationDto.PaperItem> getPersonalizedPapers(UUID userId, int size) {
        int cappedSize = Math.min(size, 50);

        // 1. Redis 캐시 확인
        String cacheKey = RecommendationCacheKeys.paper(userId);
        String cachedJson = redisTemplate.opsForValue().get(cacheKey);
        if (cachedJson != null) {
            try {
                List<RecommendationDto.PaperItem> cached = objectMapper.readValue(
                        cachedJson, new TypeReference<>() {});
                return cached.stream().limit(cappedSize).toList();
            } catch (Exception e) {
                log.warn("[Rec] 논문 캐시 역직렬화 실패, 캐시 무효화: userId={}", userId);
                redisTemplate.delete(cacheKey);
            }
        }

        // 프로파일은 한 번만 읽고, 계산 시작 시점의 revision을 기억해 둔다 (캐시 저장 직전 비교용)
        Map<Object, Object> profile = getProfile(userId);
        Object revisionBefore = profile.get(RecommendationCacheKeys.PROFILE_REVISION_FIELD);

        // 2. 이미 본 논문 ID 수집
        Set<String> viewedPaperIds = getViewedPaperIds(profile);

        // 3. ALS 배치 추천 결과 조회 (content_type = PAPER)
        List<UserRecommendation> alsRecs = userRecommendationRepository
                .findValidByUserIdAndContentType(userId, "PAPER", LocalDateTime.now());

        Map<String, Double> alsScoreMap = alsRecs.stream()
                .collect(Collectors.toMap(
                        UserRecommendation::getArticleId,
                        r -> r.getScore().doubleValue(),
                        (a, b) -> a
                ));

        // 4. 유저 프로파일 키워드 매칭 (최근 30일)
        List<String> topKeywords = getTopKeywordsFromProfile(profile);
        List<com.mcp.airadar.paper.entity.Paper> keywordCandidates = List.of();
        if (!topKeywords.isEmpty()) {
            String pgArrayLiteral = toPgArrayLiteral(topKeywords);
            keywordCandidates = paperRepository.findByKeywordsOverlap(
                    pgArrayLiteral,
                    LocalDateTime.now().minusDays(30),
                    cappedSize * CANDIDATE_MULTIPLIER
            ).stream()
                    .filter(p -> !viewedPaperIds.contains(p.getPaperId()))
                    .toList();
        }

        // ALS 논문 후보 추가 (키워드 후보와 중복 제거)
        Set<String> seenIds = keywordCandidates.stream()
                .map(com.mcp.airadar.paper.entity.Paper::getPaperId)
                .collect(Collectors.toSet());

        List<com.mcp.airadar.paper.entity.Paper> alsCandidates = List.of();
        if (!alsRecs.isEmpty()) {
            List<String> alsIds = alsRecs.stream()
                    .map(UserRecommendation::getArticleId)
                    .filter(id -> !seenIds.contains(id) && !viewedPaperIds.contains(id))
                    .toList();
            if (!alsIds.isEmpty()) {
                alsCandidates = paperRepository.findAllById(alsIds);
            }
        }

        List<com.mcp.airadar.paper.entity.Paper> allCandidates = new ArrayList<>(keywordCandidates);
        allCandidates.addAll(alsCandidates);

        // 5. 후보 없으면 Cold start
        if (allCandidates.isEmpty()) {
            return paperRepository.findTop20ByIsActiveTrueOrderByPublishedAtDesc().stream()
                    .filter(p -> !viewedPaperIds.contains(p.getPaperId()))
                    .limit(cappedSize)
                    .map(p -> RecommendationDto.PaperItem.from(p, "COLD_START"))
                    .toList();
        }

        Map<String, Double> profileWeights = getProfileKeywordWeights(profile);

        List<RecommendationDto.PaperItem> ranked = allCandidates.stream()
                .sorted((a, b) -> Double.compare(
                        calculatePaperCombinedScore(b, profileWeights, alsScoreMap),
                        calculatePaperCombinedScore(a, profileWeights, alsScoreMap)
                ))
                .limit(cappedSize)
                .map(p -> RecommendationDto.PaperItem.from(p,
                        alsScoreMap.containsKey(p.getPaperId()) ? "ALS" : "KEYWORD_MATCH"))
                .toList();

        // 5. 캐시 저장 (30분) — 계산 중 프로파일이 바뀌었으면 stale 결과이므로 저장하지 않는다
        cacheIfProfileUnchanged(userId, cacheKey, ranked, revisionBefore);

        return ranked;
    }

    // ─── 내부 헬퍼 ─────────────────────────────────────────────────────

    private List<RecommendationDto.NewsItem> getCachedRecommendations(UUID userId) {
        String key = RecommendationCacheKeys.news(userId);
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

    private void cacheRecommendations(UUID userId, List<RecommendationDto.NewsItem> items, Object revisionBefore) {
        cacheIfProfileUnchanged(userId, RecommendationCacheKeys.news(userId), items, revisionBefore);
    }

    /**
     * Redis Hash에서 "kw:" 접두사 필드를 score 내림차순으로 정렬하여 상위 키워드 반환
     */
    private List<String> getTopKeywordsFromProfile(Map<Object, Object> profile) {
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
    private Map<String, Double> getProfileKeywordWeights(Map<Object, Object> profile) {
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

    private List<RecommendationDto.NewsItem> getColdStartFeed(int size, Set<String> viewedArticleIds) {
        return newsRepository.findTop20ByIsActiveTrueOrderByScoreDescPublishedAtDesc()
                .stream()
                .filter(item -> !viewedArticleIds.contains(item.getArticleId()))
                .limit(size)
                .map(item -> RecommendationDto.NewsItem.from(item, "COLD_START"))
                .toList();
    }

    /**
     * 논문 ALS + 키워드 결합 점수
     * ALS 있음: ALS(0.4) + 키워드(0.3) + 최신성(0.3)
     * ALS 없음: 키워드(0.7) + 최신성(0.3)
     */
    private double calculatePaperCombinedScore(com.mcp.airadar.paper.entity.Paper paper,
                                               Map<String, Double> profileWeights,
                                               Map<String, Double> alsScoreMap) {
        double alsScore = alsScoreMap.getOrDefault(paper.getPaperId(), 0.0);
        boolean hasAls = alsScoreMap.containsKey(paper.getPaperId());

        double keywordScore = 0.0;
        if (paper.getKeywords() != null) {
            keywordScore = Arrays.stream(paper.getKeywords())
                    .mapToDouble(kw -> profileWeights.getOrDefault(kw, 0.0))
                    .sum();
        }
        double recencyScore = 0.0;
        if (paper.getPublishedAt() != null) {
            long daysOld = Duration.between(paper.getPublishedAt(), LocalDateTime.now()).toDays();
            recencyScore = Math.exp(-0.05 * daysOld); // 논문은 뉴스보다 감쇠 느림
        }
        if (hasAls) {
            return alsScore * 0.4 + keywordScore * 0.3 + recencyScore * 0.3;
        } else {
            return keywordScore * 0.7 + recencyScore * 0.3;
        }
    }

    /** 이미 본 논문 ID 집합 (Redis profile art: 접두사, paper 전용 ppv: 접두사) */
    private Set<String> getViewedPaperIds(Map<Object, Object> profile) {
        return profile.keySet().stream()
                .map(Object::toString)
                .filter(k -> k.startsWith("ppv:"))
                .map(k -> k.substring(4))
                .collect(Collectors.toSet());
    }

    /**
     * Redis profile의 art: 접두사 필드에서 이미 본(조회/북마크) 기사 ID 집합 반환.
     * UserEventService.updateProfileForArticle이 조회·북마크마다 art:{articleId}를 기록한다.
     */
    private Set<String> getViewedArticleIds(Map<Object, Object> profile) {
        return profile.keySet().stream()
                .map(Object::toString)
                .filter(k -> k.startsWith("art:"))
                .map(k -> k.substring(4))
                .collect(Collectors.toSet());
    }

    /** 유저 프로파일 Hash 전체 (추천 1회 계산당 한 번만 읽는다) */
    private Map<Object, Object> getProfile(UUID userId) {
        return redisTemplate.opsForHash().entries(RecommendationCacheKeys.profile(userId));
    }

    /**
     * 계산 시작 이후 프로파일 revision이 그대로일 때만 결과를 캐시에 저장한다.
     * 무효화 이벤트가 그 사이에 끼어들었다면 방금 계산한 결과는 stale이므로 저장하지 않는다.
     * 확인과 저장이 Redis 안에서 한 번에 실행되므로 그 사이에 이벤트가 끼어들 수 없다.
     * 직렬화나 실행이 실패하면 저장하지 않는 쪽(안전한 쪽)으로 판단하고 결과 응답에는 영향을 주지 않는다.
     */
    private void cacheIfProfileUnchanged(UUID userId, String cacheKey, Object payload, Object revisionBefore) {
        try {
            String json = objectMapper.writeValueAsString(payload);
            Long stored = redisTemplate.execute(
                    CACHE_IF_PROFILE_UNCHANGED,
                    List.of(RecommendationCacheKeys.profile(userId), cacheKey),
                    RecommendationCacheKeys.PROFILE_REVISION_FIELD,
                    revisionBefore == null ? "" : revisionBefore.toString(),
                    json,
                    String.valueOf(REC_CACHE_TTL.toMillis()));
            if (!Long.valueOf(1L).equals(stored)) {
                log.debug("[Rec] 계산 중 프로파일 변경 감지, 캐시 저장 생략: userId={}", userId);
            }
        } catch (Exception e) {
            log.warn("[Rec] 캐시 저장 실패, 저장 생략: userId={}, cause={}", userId, e.toString());
        }
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
