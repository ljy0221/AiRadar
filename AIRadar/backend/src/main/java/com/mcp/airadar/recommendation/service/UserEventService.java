package com.mcp.airadar.recommendation.service;

import com.mcp.airadar.news.repository.NewsRepository;
import com.mcp.airadar.paper.repository.PaperRepository;
import com.mcp.airadar.recommendation.entity.EventType;
import com.mcp.airadar.recommendation.entity.SearchLog;
import com.mcp.airadar.recommendation.repository.SearchLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.log4j.Log4j2;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * 사용자 이벤트 비동기 처리 서비스
 *
 * API 응답을 블로킹하지 않도록 @Async("eventExecutor")로 처리.
 * 실패해도 추천 품질 저하에 그침 — 예외를 삼키고 로그만 남긴다.
 *
 * 처리 순서:
 *   1. Redis 유저 프로파일 가중치 업데이트
 *   2. Redis 트렌딩 Sorted Set 업데이트 (검색 이벤트만)
 *   3. search_logs 테이블에 이벤트 저장 (Spark 배치용)
 */
@Log4j2
@Service
@RequiredArgsConstructor
public class UserEventService {

    private static final String TRENDING_KEY     = "search:trending";
    private static final String TRENDING_HOURLY  = "search:trending:%s";

    // 이벤트별 가중치
    private static final double W_VIEW_LONG  = 1.0;  // 30초 이상 체류
    private static final double W_SEARCH     = 2.0;
    private static final double W_BOOKMARK   = 5.0;

    // 부동소수 오차를 고려해, 되돌린 뒤 이 값 이하가 된 프로파일 필드는 제거한다
    private static final double PROFILE_WEIGHT_EPSILON = 1e-9;

    // 북마크가 프로파일에 반영된 횟수(bm:)와 그때 반영한 키워드(bmkw:) — 프로파일과 같은 수명(TTL)을 가진다.
    // 북마크 삭제 시 "프로파일이 실제로 기록한 만큼만" 되돌리기 위한 근거이며, 프로파일이 만료되면 함께 사라진다.
    private static final String BOOKMARK_COUNT_PREFIX    = "bm:";
    private static final String BOOKMARK_KEYWORDS_PREFIX = "bmkw:";
    private static final String KEYWORD_SEPARATOR        = "";

    private static final double W_TRENDING_AUTH = 1.0;
    private static final double W_TRENDING_ANON = 0.5;

    private final StringRedisTemplate redisTemplate;
    private final SearchLogRepository searchLogRepository;
    private final NewsRepository newsRepository;
    private final PaperRepository paperRepository;

    // ─── 공개 API (Controller에서 호출) ────────────────────────────────

    /** 기사 조회 이벤트 (30초 이상 체류 시만 프로파일 반영) */
    @Async("eventExecutor")
    @Transactional
    public void onArticleViewed(UUID userId, String articleId, int dwellTimeSeconds) {
        try {
            updateProfileForArticle(userId, articleId, W_VIEW_LONG);
            invalidateNewsRecommendationCache(userId);
            saveLog(userId, articleId, null, EventType.ARTICLE_VIEWED);
        } catch (Exception e) {
            log.warn("[Event] ARTICLE_VIEWED 처리 실패 (무시): {}", e.getMessage());
        }
    }

    /** 검색 이벤트 — 로그인/비로그인 모두 트렌딩 반영, 로그인만 프로파일 반영 */
    @Async("eventExecutor")
    @Transactional
    public void onArticleSearched(UUID userId, String query) {
        try {
            // 소문자 정규화: news_items.keywords가 영어 소문자이므로 매칭을 위해 통일
            String normalizedQuery = query.trim().toLowerCase();
            boolean isAnonymous = (userId == null);
            double trendingWeight = isAnonymous ? W_TRENDING_ANON : W_TRENDING_AUTH;

            // 트렌딩 업데이트 (전체 + 시간대별) — 정규화된 쿼리 사용
            redisTemplate.opsForZSet().incrementScore(TRENDING_KEY, normalizedQuery, trendingWeight);
            String hourlyKey = TRENDING_HOURLY.formatted(
                    LocalDateTime.now().truncatedTo(ChronoUnit.HOURS)
                            .format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH"))
            );
            redisTemplate.opsForZSet().incrementScore(hourlyKey, normalizedQuery, trendingWeight);
            redisTemplate.expire(hourlyKey, Duration.ofHours(2));

            // 로그인 사용자만 프로파일 반영
            if (!isAnonymous) {
                String key = RecommendationCacheKeys.profile(userId);
                redisTemplate.opsForHash().increment(key, "kw:" + normalizedQuery, W_SEARCH);
                refreshProfileTtl(key);
            }

            saveLog(userId, null, normalizedQuery, EventType.ARTICLE_SEARCHED);
        } catch (Exception e) {
            log.warn("[Event] ARTICLE_SEARCHED 처리 실패 (무시): {}", e.getMessage());
        }
    }

    /**
     * 논문 조회 이벤트 (30초 이상 체류 시만 프로파일 반영)
     * ppv:{paperId} 필드로 본 논문 추적 → 추천 필터링에 활용
     */
    @Async("eventExecutor")
    @Transactional
    public void onPaperViewed(UUID userId, String paperId, int dwellTimeSeconds) {
        try {
            if (userId == null) return;
            String key = RecommendationCacheKeys.profile(userId);
            // 본 논문 ID 기록 (추천 필터링용)
            redisTemplate.opsForHash().increment(key, "ppv:" + paperId, 1.0);
            updateProfileForPaper(userId, paperId, W_VIEW_LONG);
            invalidatePaperRecommendationCache(userId);
            refreshProfileTtl(key);
            saveLog(userId, paperId, null, EventType.ARTICLE_VIEWED);
        } catch (Exception e) {
            log.warn("[Event] PAPER_VIEWED 처리 실패 (무시): {}", e.getMessage());
        }
    }

    /** 북마크 이벤트 */
    @Async("eventExecutor")
    @Transactional
    public void onArticleBookmarked(UUID userId, String articleId) {
        try {
            String[] credited = updateProfileForArticle(userId, articleId, W_BOOKMARK);
            recordBookmarkContribution(userId, articleId, credited);
            invalidateRecommendationCache(userId);
            saveLog(userId, articleId, null, EventType.ARTICLE_BOOKMARKED);
        } catch (Exception e) {
            log.warn("[Event] ARTICLE_BOOKMARKED 처리 실패 (무시): {}", e.getMessage());
        }
    }

    /**
     * 북마크 삭제 시 북마크가 프로파일에 더한 가중치를 되돌린다.
     *
     * search_logs의 삭제된 행 수를 그대로 믿지 않고, 프로파일이 실제로 기록해 둔 북마크 횟수(bm:{articleId})만큼만
     * 원자적으로 차감(claim)한다. 프로파일이 그 사이 만료되었거나(기록도 함께 사라짐), 이 기능 도입 이전의 북마크라서
     * 기록이 없으면 되돌릴 것이 없다고 보고 아무것도 건드리지 않는다 — 조회·검색으로 쌓은 가중치를 지우지 않기 위함이다.
     * 되돌릴 때 빼는 키워드도 삭제 시점의 기사가 아니라 북마크 시점에 반영한 키워드(bmkw:)를 쓴다.
     * 동시에 같은 삭제가 두 번 들어와도 차감 총량은 기록된 횟수를 넘지 않는다.
     * 되돌린 뒤(또는 되돌리는 도중 실패해도) 추천 캐시를 무효화한다. 실패해도 북마크 삭제 자체를 막지 않는다.
     *
     * @param removedCount search_logs에서 실제로 삭제된 ARTICLE_BOOKMARKED 행 수
     */
    @Async("eventExecutor")
    public void onBookmarkRemoved(UUID userId, String articleId, long removedCount) {
        if (userId == null || removedCount <= 0) return;
        try {
            String key = RecommendationCacheKeys.profile(userId);
            Object recordedKeywords = redisTemplate.opsForHash().get(key, BOOKMARK_KEYWORDS_PREFIX + articleId);

            long claimed = claimBookmarkContribution(key, articleId, removedCount);
            if (claimed <= 0) return;

            try {
                double delta = W_BOOKMARK * claimed;
                subtractFromProfile(key, "art:" + articleId, delta);
                if (recordedKeywords != null && !recordedKeywords.toString().isEmpty()) {
                    for (String kw : recordedKeywords.toString().split(KEYWORD_SEPARATOR)) {
                        subtractFromProfile(key, "kw:" + kw, delta);
                    }
                }
            } finally {
                invalidateRecommendationCache(userId);
            }
        } catch (Exception e) {
            log.warn("[Event] 북마크 삭제 프로파일 되돌리기 실패 (무시): {}", e.getMessage());
        }
    }

    /** 트렌딩 키워드 Top N 조회 */
    public List<String> getTopTrending(int limit) {
        Set<String> result = redisTemplate.opsForZSet()
                .reverseRange(TRENDING_KEY, 0, limit - 1);
        return result != null ? List.copyOf(result) : List.of();
    }

    /** 시간대별 핫이슈 Top N 조회 */
    public List<String> getHourlyTrending(int limit) {
        String hourlyKey = TRENDING_HOURLY.formatted(
                LocalDateTime.now().truncatedTo(ChronoUnit.HOURS)
                        .format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH"))
        );
        Set<String> result = redisTemplate.opsForZSet()
                .reverseRange(hourlyKey, 0, limit - 1);
        return result != null ? List.copyOf(result) : List.of();
    }

    // ─── 내부 헬퍼 ────────────────────────────────────────────────────

    /**
     * 기사의 keywords 컬럼을 DB에서 조회하여 프로파일 가중치 업데이트.
     * kw:{keyword} 필드에 가중치를 누적 → RecommendationService 재랭킹에 반영.
     */
    private String[] updateProfileForArticle(UUID userId, String articleId, double weight) {
        if (userId == null) return new String[0];
        String key = RecommendationCacheKeys.profile(userId);

        // 본 기사 ID 기록 (추천 필터링용)
        redisTemplate.opsForHash().increment(key, "art:" + articleId, weight);

        // 기사의 실제 키워드를 DB에서 조회해 kw: 필드에 반영
        String[] credited = newsRepository.findByArticleIdAndIsActiveTrue(articleId)
                .map(article -> article.getKeywords() == null ? new String[0] : article.getKeywords())
                .orElse(new String[0]);
        for (String kw : credited) {
            redisTemplate.opsForHash().increment(key, "kw:" + kw, weight);
        }

        refreshProfileTtl(key);
        return credited;
    }

    /**
     * 북마크가 프로파일에 반영한 횟수와 키워드를 프로파일 안에 기록한다 (북마크 삭제 시 되돌릴 근거).
     * 보조 기록이므로 실패해도 북마크 이벤트 처리(캐시 무효화·로그 저장)를 막지 않는다.
     */
    private void recordBookmarkContribution(UUID userId, String articleId, String[] credited) {
        if (userId == null) return;
        try {
            String key = RecommendationCacheKeys.profile(userId);
            redisTemplate.opsForHash().increment(key, BOOKMARK_COUNT_PREFIX + articleId, 1L);
            if (credited.length > 0) {
                redisTemplate.opsForHash().put(key, BOOKMARK_KEYWORDS_PREFIX + articleId,
                        String.join(KEYWORD_SEPARATOR, credited));
            }
        } catch (Exception e) {
            log.warn("[Event] 북마크 반영 기록 실패 (무시): userId={}, cause={}", userId, e.toString());
        }
    }

    /**
     * 프로파일이 기록한 북마크 횟수(bm:{articleId})에서 최대 requested만큼을 원자적으로 차감하고, 실제로 차감한 횟수를 반환한다.
     * 기록된 횟수보다 많이 요청되면(동시 삭제, 만료 후 삭제 등) 초과분은 되돌려 놓고 기록된 만큼만 반환한다.
     * 기록이 모두 소진되면 bm:/bmkw: 필드를 정리한다.
     */
    private long claimBookmarkContribution(String key, String articleId, long requested) {
        String countField = BOOKMARK_COUNT_PREFIX + articleId;
        Long after = redisTemplate.opsForHash().increment(key, countField, -requested);
        if (after == null) return 0;

        long claimed = requested;
        long remaining = after;
        if (after < 0) {
            claimed = requested + after;                                   // 기록된 만큼만 차감한 것으로 본다
            redisTemplate.opsForHash().increment(key, countField, -after); // 초과 차감분 복구 (0으로)
            remaining = 0;
        }
        if (remaining <= 0) {
            redisTemplate.opsForHash().delete(key, countField, BOOKMARK_KEYWORDS_PREFIX + articleId);
        }
        return Math.max(claimed, 0);
    }


    /** 논문의 실제 keywords를 DB에서 조회해 프로파일 kw: 필드에 반영 */
    private void updateProfileForPaper(UUID userId, String paperId, double weight) {
        if (userId == null) return;
        String key = RecommendationCacheKeys.profile(userId);
        paperRepository.findByPaperIdAndIsActiveTrue(paperId).ifPresent(paper -> {
            String[] keywords = paper.getKeywords();
            if (keywords != null) {
                for (String kw : keywords) {
                    redisTemplate.opsForHash().increment(key, "kw:" + kw, weight);
                }
            }
        });
    }

    /** 프로파일 필드 값에서 delta를 빼고, 0 이하가 되면 필드를 제거한다 */
    private void subtractFromProfile(String key, String field, double delta) {
        Double remaining = redisTemplate.opsForHash().increment(key, field, -delta);
        if (remaining != null && remaining <= PROFILE_WEIGHT_EPSILON) {
            redisTemplate.opsForHash().delete(key, field);
        }
    }

    private void refreshProfileTtl(String key) {
        redisTemplate.expire(key, Duration.ofDays(30));
        redisTemplate.opsForHash().put(key, "last_active", LocalDateTime.now().toString());
    }

    /** 프로파일 kw: 가중치는 뉴스·논문이 공유하므로 북마크 시 두 캐시를 함께 무효화 */
    private void invalidateRecommendationCache(UUID userId) {
        invalidateNewsRecommendationCache(userId);
        invalidatePaperRecommendationCache(userId);
    }

    private void invalidateNewsRecommendationCache(UUID userId) {
        invalidateCache(userId, RecommendationCacheKeys.news(userId), "뉴스");
    }

    private void invalidatePaperRecommendationCache(UUID userId) {
        invalidateCache(userId, RecommendationCacheKeys.paper(userId), "논문");
    }

    /**
     * 프로파일 revision을 먼저 올린 뒤 캐시를 삭제한다.
     * 서빙은 계산 전후 revision이 다를 때 결과를 저장하지 않으므로, 삭제 직후 진행 중이던
     * 요청이 stale 결과를 다시 캐시에 쓰는 경합을 막는다.
     * revision 증가는 보조 수단이므로 실패해도 캐시 삭제를 막아서는 안 된다 — 각각 따로 예외를 삼킨다.
     * 실패가 이벤트 로그 저장·후속 캐시 삭제를 막지 않는다 (TTL 만료로 자연 갱신됨).
     */
    private void invalidateCache(UUID userId, String cacheKey, String label) {
        if (userId == null) return;
        try {
            redisTemplate.opsForHash().increment(
                    RecommendationCacheKeys.profile(userId), RecommendationCacheKeys.PROFILE_REVISION_FIELD, 1L);
        } catch (Exception e) {
            log.warn("[Event] 프로파일 revision 증가 실패 (무시, 대상={}): userId={}, cause={}", label, userId, e.toString());
        }
        try {
            redisTemplate.delete(cacheKey);
        } catch (Exception e) {
            log.warn("[Event] {} 추천 캐시 삭제 실패 (무시): userId={}, cause={}", label, userId, e.toString());
        }
    }

    private void saveLog(UUID userId, String articleId, String query, EventType eventType) {
        searchLogRepository.save(SearchLog.builder()
                .userId(userId)
                .articleId(articleId)
                .query(query)
                .eventType(eventType.name())
                .occurredAt(LocalDateTime.now())
                .build());
    }

    // ─── 스케줄 작업 ──────────────────────────────────────────────────

    /** 매일 자정 트렌딩 점수 50% 감쇠 — 오래된 키워드 자연 하락 (pipeline 일괄 처리) */
    @Scheduled(cron = "0 0 0 * * *")
    public void decayTrendingScores() {
        var entries = redisTemplate.opsForZSet().rangeWithScores(TRENDING_KEY, 0, -1);
        if (entries == null || entries.isEmpty()) return;

        // pipeline으로 감쇠 업데이트 — 키워드 수만큼 Redis 왕복 발생하던 문제 해결
        redisTemplate.executePipelined((org.springframework.data.redis.core.RedisCallback<Object>) conn -> {
            entries.forEach(entry -> {
                if (entry.getValue() != null) {
                    conn.zSetCommands().zAdd(
                        TRENDING_KEY.getBytes(),
                        entry.getScore() * 0.5,
                        entry.getValue().getBytes()
                    );
                }
            });
            return null;
        });

        // 0.1 미만 제거 (오래된 키워드 정리)
        redisTemplate.opsForZSet().removeRangeByScore(TRENDING_KEY, 0, 0.1);
        log.info("[Trending] 감쇠 완료. 잔여 키워드: {}",
                redisTemplate.opsForZSet().size(TRENDING_KEY));
    }
}
