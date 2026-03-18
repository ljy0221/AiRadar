package com.mcp.airadar.recommendation.service;

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

    private static final String PROFILE_KEY      = "user:%s:profile";
    private static final String TRENDING_KEY     = "search:trending";
    private static final String TRENDING_HOURLY  = "search:trending:%s";

    // 이벤트별 가중치
    private static final double W_VIEW_LONG  = 1.0;  // 30초 이상 체류
    private static final double W_SEARCH     = 2.0;
    private static final double W_LIKE       = 3.0;
    private static final double W_BOOKMARK   = 5.0;

    private static final double W_TRENDING_AUTH = 1.0;
    private static final double W_TRENDING_ANON = 0.5;

    private final StringRedisTemplate redisTemplate;
    private final SearchLogRepository searchLogRepository;

    // ─── 공개 API (Controller에서 호출) ────────────────────────────────

    /** 기사 조회 이벤트 (30초 이상 체류 시만 프로파일 반영) */
    @Async("eventExecutor")
    @Transactional
    public void onArticleViewed(UUID userId, String articleId, int dwellTimeSeconds) {
        try {
            if (dwellTimeSeconds >= 30) {
                updateProfileForArticle(userId, articleId, W_VIEW_LONG);
            }
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
            boolean isAnonymous = (userId == null);
            double trendingWeight = isAnonymous ? W_TRENDING_ANON : W_TRENDING_AUTH;

            // 트렌딩 업데이트 (전체 + 시간대별)
            redisTemplate.opsForZSet().incrementScore(TRENDING_KEY, query, trendingWeight);
            String hourlyKey = TRENDING_HOURLY.formatted(
                    LocalDateTime.now().truncatedTo(ChronoUnit.HOURS)
                            .format(DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH"))
            );
            redisTemplate.opsForZSet().incrementScore(hourlyKey, query, trendingWeight);
            redisTemplate.expire(hourlyKey, Duration.ofHours(2));

            // 로그인 사용자만 프로파일 반영
            if (!isAnonymous) {
                String key = PROFILE_KEY.formatted(userId);
                redisTemplate.opsForHash().increment(key, "kw:" + query, W_SEARCH);
                refreshProfileTtl(key);
            }

            saveLog(userId, null, query, EventType.ARTICLE_SEARCHED);
        } catch (Exception e) {
            log.warn("[Event] ARTICLE_SEARCHED 처리 실패 (무시): {}", e.getMessage());
        }
    }

    /** 좋아요 이벤트 */
    @Async("eventExecutor")
    @Transactional
    public void onArticleLiked(UUID userId, String articleId) {
        try {
            updateProfileForArticle(userId, articleId, W_LIKE);
            invalidateRecommendationCache(userId);
            saveLog(userId, articleId, null, EventType.ARTICLE_LIKED);
        } catch (Exception e) {
            log.warn("[Event] ARTICLE_LIKED 처리 실패 (무시): {}", e.getMessage());
        }
    }

    /** 북마크 이벤트 */
    @Async("eventExecutor")
    @Transactional
    public void onArticleBookmarked(UUID userId, String articleId) {
        try {
            updateProfileForArticle(userId, articleId, W_BOOKMARK);
            invalidateRecommendationCache(userId);
            saveLog(userId, articleId, null, EventType.ARTICLE_BOOKMARKED);
        } catch (Exception e) {
            log.warn("[Event] ARTICLE_BOOKMARKED 처리 실패 (무시): {}", e.getMessage());
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
     * 기사의 keywords 컬럼 기반으로 프로파일 가중치 업데이트.
     * keywords를 DB에서 가져오는 대신 articleId를 직접 저장 — 키워드 조회는 추후 구현.
     * 현재는 articleId를 "art:{id}" 필드로 기록하여 배치에서 매핑 가능하게 함.
     */
    private void updateProfileForArticle(UUID userId, String articleId, double weight) {
        if (userId == null) return;
        String key = PROFILE_KEY.formatted(userId);
        redisTemplate.opsForHash().increment(key, "art:" + articleId, weight);
        refreshProfileTtl(key);
    }

    private void refreshProfileTtl(String key) {
        redisTemplate.expire(key, Duration.ofDays(30));
        redisTemplate.opsForHash().put(key, "last_active", LocalDateTime.now().toString());
    }

    private void invalidateRecommendationCache(UUID userId) {
        if (userId == null) return;
        redisTemplate.delete("user:" + userId + ":recommendations");
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

    /** 매일 자정 트렌딩 점수 50% 감쇠 — 오래된 키워드 자연 하락 */
    @Scheduled(cron = "0 0 0 * * *")
    public void decayTrendingScores() {
        var entries = redisTemplate.opsForZSet().rangeWithScores(TRENDING_KEY, 0, -1);
        if (entries == null || entries.isEmpty()) return;

        entries.forEach(entry -> {
            if (entry.getValue() != null) {
                redisTemplate.opsForZSet().add(TRENDING_KEY, entry.getValue(), entry.getScore() * 0.5);
            }
        });
        // 0.1 미만 제거 (오래된 키워드 정리)
        redisTemplate.opsForZSet().removeRangeByScore(TRENDING_KEY, 0, 0.1);
        log.info("[Trending] 감쇠 완료. 잔여 키워드: {}",
                redisTemplate.opsForZSet().size(TRENDING_KEY));
    }
}
