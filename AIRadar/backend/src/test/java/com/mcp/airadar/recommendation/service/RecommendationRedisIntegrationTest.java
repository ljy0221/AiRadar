package com.mcp.airadar.recommendation.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mcp.airadar.news.entity.NewsItem;
import com.mcp.airadar.news.repository.NewsRepository;
import com.mcp.airadar.paper.repository.PaperRepository;
import com.mcp.airadar.recommendation.dto.RecommendationDto;
import com.mcp.airadar.recommendation.repository.SearchLogRepository;
import com.mcp.airadar.recommendation.repository.UserRecommendationRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assumptions.assumeTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * 실제 Redis에 붙어 자바 ↔ Redis 연결부를 검증하는 통합 테스트.
 * mock 단위 테스트가 확인하지 못하는 것들 — Lua 스크립트 인자 직렬화, Long 반환, EVALSHA 폴백,
 * HINCRBY/HINCRBYFLOAT/HDEL 의미, 계산 중 이벤트가 끼어드는 경합 — 을 다룬다.
 *
 * 환경변수 AIRADAR_REDIS_IT=host:port 가 있고 접속 가능할 때만 실행되며, 없으면 건너뛴다 (CI에는 영향 없음).
 *
 *   docker run -d --name airadar-redis-verify -p 6390:6379 redis:7-alpine
 *   AIRADAR_REDIS_IT=localhost:6390 ./gradlew test --tests '*RecommendationRedisIntegrationTest'
 *
 * 사용자마다 임의의 UUID를 쓰고 끝나면 자기 키만 지우므로 FLUSH는 하지 않는다.
 */
class RecommendationRedisIntegrationTest {

    private static LettuceConnectionFactory factory;
    private static StringRedisTemplate redis;

    private NewsRepository newsRepository;
    private PaperRepository paperRepository;
    private SearchLogRepository searchLogRepository;
    private UserRecommendationRepository userRecommendationRepository;

    private RecommendationService recommendationService;
    private UserEventService userEventService;
    private UUID userId;

    @BeforeAll
    static void connect() {
        String target = System.getenv("AIRADAR_REDIS_IT");
        assumeTrue(target != null && target.contains(":"), "AIRADAR_REDIS_IT=host:port 가 없어 실제 Redis 통합 테스트를 건너뜀");
        String[] hp = target.split(":");
        LettuceConnectionFactory f = new LettuceConnectionFactory(hp[0], Integer.parseInt(hp[1]));
        f.afterPropertiesSet();
        try (RedisConnection c = f.getConnection()) {
            assumeTrue("PONG".equalsIgnoreCase(c.ping()), "Redis에 접속할 수 없어 통합 테스트를 건너뜀");
        } catch (Exception e) {
            assumeTrue(false, "Redis에 접속할 수 없어 통합 테스트를 건너뜀: " + e.getMessage());
        }
        factory = f;
        redis = new StringRedisTemplate(f);
        redis.afterPropertiesSet();
    }

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        newsRepository = mock(NewsRepository.class);
        paperRepository = mock(PaperRepository.class);
        searchLogRepository = mock(SearchLogRepository.class);
        userRecommendationRepository = mock(UserRecommendationRepository.class);

        when(newsRepository.findByArticleIdAndIsActiveTrue(anyString())).thenReturn(Optional.empty());
        when(userRecommendationRepository.findValidByUserId(any(), any())).thenReturn(List.of());

        userEventService = new UserEventService(redis, searchLogRepository, newsRepository, paperRepository);
        recommendationService = new RecommendationService(
                redis, newsRepository, paperRepository, userRecommendationRepository,
                new ObjectMapper().findAndRegisterModules());
    }

    @AfterEach
    void cleanUp() {
        if (redis != null && userId != null) {
            redis.delete(List.of(RecommendationCacheKeys.profile(userId),
                    RecommendationCacheKeys.news(userId), RecommendationCacheKeys.paper(userId)));
        }
    }

    // ─── Lua 스크립트 연결부 ──────────────────────────────────────────────────

    @Test
    @DisplayName("스크립트: 인자가 문자열로 전달되고 Long 1이 반환되며 캐시가 PX(ms) TTL로 저장됨")
    void script_storesWhenRevisionUnchanged_returnsLongAndAppliesTtl() {
        String profile = RecommendationCacheKeys.profile(userId);
        String cache = RecommendationCacheKeys.news(userId);
        redis.opsForHash().put(profile, "rev", "3");

        Long stored = redis.execute(RecommendationService.CACHE_IF_PROFILE_UNCHANGED,
                List.of(profile, cache), "rev", "3", "[\"payload\"]", "1800000");

        assertThat(stored).isEqualTo(1L);
        assertThat(redis.opsForValue().get(cache)).isEqualTo("[\"payload\"]");
        Long ttlMs = redis.getExpire(cache, TimeUnit.MILLISECONDS);
        assertThat(ttlMs).isBetween(1L, 1_800_000L);
    }

    @Test
    @DisplayName("스크립트: rev가 다르면 0을 반환하고 기존 캐시를 덮어쓰지 않음")
    void script_skipsWhenRevisionChanged() {
        String profile = RecommendationCacheKeys.profile(userId);
        String cache = RecommendationCacheKeys.news(userId);
        redis.opsForHash().put(profile, "rev", "4");
        redis.opsForValue().set(cache, "old");

        Long stored = redis.execute(RecommendationService.CACHE_IF_PROFILE_UNCHANGED,
                List.of(profile, cache), "rev", "3", "new", "1800000");

        assertThat(stored).isEqualTo(0L);
        assertThat(redis.opsForValue().get(cache)).isEqualTo("old");
    }

    @Test
    @DisplayName("스크립트: 서버의 스크립트 캐시가 비워져도(SCRIPT FLUSH) EVALSHA 실패 후 EVAL로 폴백해 정상 동작")
    void script_fallsBackToEvalAfterScriptFlush() {
        String profile = RecommendationCacheKeys.profile(userId);
        String cache = RecommendationCacheKeys.news(userId);

        redis.execute(RecommendationService.CACHE_IF_PROFILE_UNCHANGED,
                List.of(profile, cache), "rev", "", "first", "1800000");   // 스크립트를 서버에 적재
        try (RedisConnection c = factory.getConnection()) {
            c.scriptingCommands().scriptFlush();                              // NOSCRIPT 상태로 만듦
        }
        redis.delete(cache);

        Long stored = redis.execute(RecommendationService.CACHE_IF_PROFILE_UNCHANGED,
                List.of(profile, cache), "rev", "", "second", "1800000");

        assertThat(stored).isEqualTo(1L);
        assertThat(redis.opsForValue().get(cache)).isEqualTo("second");
    }

    // ─── 서빙 ↔ 이벤트 경합 (실제 Redis) ──────────────────────────────────────

    @Test
    @DisplayName("서빙: 방해가 없으면 결과가 캐시에 저장되고, 이후 요청은 캐시에서 응답 (TTL 30분 이내)")
    void feed_isCachedWhenNothingInterferes() {
        seedKeywordProfile();
        when(newsRepository.findByKeywordsOverlap(anyString(), any(), anyInt())).thenReturn(List.of(newsItem("art-1")));

        List<RecommendationDto.NewsItem> first = recommendationService.getPersonalizedFeed(userId, 20);

        assertThat(first).hasSize(1);
        String cache = RecommendationCacheKeys.news(userId);
        assertThat(redis.opsForValue().get(cache)).contains("art-1");
        assertThat(redis.getExpire(cache, TimeUnit.SECONDS)).isBetween(1L, 1800L);

        // 두 번째 호출은 DB(키워드 쿼리)를 다시 타지 않고 캐시로 응답해야 한다
        when(newsRepository.findByKeywordsOverlap(anyString(), any(), anyInt())).thenThrow(new AssertionError("캐시를 안 탐"));
        assertThat(recommendationService.getPersonalizedFeed(userId, 20)).hasSize(1);
    }

    @Test
    @DisplayName("경합: 계산 도중 조회 이벤트가 끼어들면 stale 결과를 캐시에 저장하지 않음 (응답은 정상)")
    void feed_isNotCachedWhenEventInterleavesDuringComputation() {
        seedKeywordProfile();
        when(newsRepository.findByKeywordsOverlap(anyString(), any(), anyInt())).thenAnswer(inv -> {
            userEventService.onArticleViewed(userId, "art-seen", 40);   // 계산 도중 이벤트 도착
            return List.of(newsItem("art-1"));
        });

        List<RecommendationDto.NewsItem> result = recommendationService.getPersonalizedFeed(userId, 20);

        assertThat(result).hasSize(1);                                              // 응답은 정상
        assertThat(redis.opsForValue().get(RecommendationCacheKeys.news(userId))).isNull();   // 그러나 캐시에는 남지 않음
        assertThat(redis.opsForHash().get(RecommendationCacheKeys.profile(userId), "rev")).isEqualTo("1");
    }

    @Test
    @DisplayName("무효화: 조회 이벤트가 프로파일 rev를 올리고 뉴스 캐시를 삭제")
    void event_invalidatesCacheAndBumpsRevision() {
        redis.opsForValue().set(RecommendationCacheKeys.news(userId), "cached");

        userEventService.onArticleViewed(userId, "art-1", 40);

        assertThat(redis.opsForValue().get(RecommendationCacheKeys.news(userId))).isNull();
        assertThat(redis.opsForHash().get(RecommendationCacheKeys.profile(userId), "rev")).isEqualTo("1");
        assertThat(redis.getExpire(RecommendationCacheKeys.profile(userId), TimeUnit.SECONDS)).isPositive();
    }

    // ─── 북마크 삭제 되돌리기 (실제 Redis) ─────────────────────────────────────

    @Test
    @DisplayName("북마크 삭제: 북마크가 더한 가중치만 되돌리고 조회로 쌓인 가중치는 유지, 기록 필드는 정리")
    void bookmarkRemoval_restoresOnlyBookmarkWeight() {
        when(newsRepository.findByArticleIdAndIsActiveTrue("art-1")).thenReturn(Optional.of(newsItem("art-1", "AI", "GPU")));
        userEventService.onArticleViewed(userId, "art-1", 40);      // art +1, kw +1
        userEventService.onArticleBookmarked(userId, "art-1");      // art +5, kw +5, bm=1

        assertThat(profile("art:art-1")).isEqualTo(6.0);
        assertThat(profile("kw:AI")).isEqualTo(6.0);
        assertThat(redis.opsForHash().get(RecommendationCacheKeys.profile(userId), "bm:art-1")).isEqualTo("1");

        userEventService.onBookmarkRemoved(userId, "art-1", 1);

        assertThat(profile("art:art-1")).isEqualTo(1.0);            // 조회 몫만 남음
        assertThat(profile("kw:AI")).isEqualTo(1.0);
        assertThat(profile("kw:GPU")).isEqualTo(1.0);
        assertThat(redis.opsForHash().hasKey(RecommendationCacheKeys.profile(userId), "bm:art-1")).isFalse();
        assertThat(redis.opsForHash().hasKey(RecommendationCacheKeys.profile(userId), "bmkw:art-1")).isFalse();
    }

    @Test
    @DisplayName("북마크 삭제: 프로파일이 만료된 뒤에는 이후 조회로 쌓인 가중치를 건드리지 않음 (원래 HIGH 지적 시나리오)")
    void bookmarkRemoval_afterProfileExpiry_doesNotEraseLaterViewWeight() {
        when(newsRepository.findByArticleIdAndIsActiveTrue("art-1")).thenReturn(Optional.of(newsItem("art-1", "AI")));
        userEventService.onArticleBookmarked(userId, "art-1");
        redis.delete(RecommendationCacheKeys.profile(userId));       // 30일 비활성으로 프로파일 만료
        userEventService.onArticleViewed(userId, "art-1", 40);       // 돌아와서 조회: art +1, kw:AI +1

        userEventService.onBookmarkRemoved(userId, "art-1", 1);      // 오래된 북마크 삭제

        assertThat(profile("art:art-1")).isEqualTo(1.0);             // 지워지지 않음
        assertThat(profile("kw:AI")).isEqualTo(1.0);
        assertThat(redis.opsForHash().hasKey(RecommendationCacheKeys.profile(userId), "bm:art-1")).isFalse();
        assertThat(redis.getExpire(RecommendationCacheKeys.profile(userId), TimeUnit.SECONDS)).isPositive();   // TTL 없는 프로파일이 남지 않음
    }

    @Test
    @DisplayName("북마크 삭제: 프로파일 자체가 없을 때 되돌릴 게 없으면 아무 키도 남기지 않음")
    void bookmarkRemoval_withNoProfile_leavesNoKeys() {
        userEventService.onBookmarkRemoved(userId, "art-1", 1);

        assertThat(redis.hasKey(RecommendationCacheKeys.profile(userId))).isFalse();
    }

    @Test
    @DisplayName("북마크 삭제: 같은 삭제가 동시에 두 번 들어와도 기록된 만큼(5.0)만 차감")
    void bookmarkRemoval_concurrentDuplicateRemovals_subtractOnce() throws Exception {
        when(newsRepository.findByArticleIdAndIsActiveTrue("art-1")).thenReturn(Optional.of(newsItem("art-1", "AI")));
        userEventService.onArticleViewed(userId, "art-1", 40);
        userEventService.onArticleBookmarked(userId, "art-1");       // art 6.0, kw:AI 6.0, bm=1

        int threads = 8;
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch ready = new CountDownLatch(threads);
        CountDownLatch go = new CountDownLatch(1);
        for (int i = 0; i < threads; i++) {
            pool.submit(() -> {
                ready.countDown();
                go.await();
                userEventService.onBookmarkRemoved(userId, "art-1", 1);
                return null;
            });
        }
        ready.await();
        go.countDown();
        pool.shutdown();
        assertThat(pool.awaitTermination(15, TimeUnit.SECONDS)).isTrue();

        assertThat(profile("art:art-1")).isEqualTo(1.0);             // 8번 요청해도 5.0만 빠짐
        assertThat(profile("kw:AI")).isEqualTo(1.0);
    }

    // ─── 헬퍼 ─────────────────────────────────────────────────────────────────

    private void seedKeywordProfile() {
        redis.opsForHash().put(RecommendationCacheKeys.profile(userId), "kw:AI", "2.0");
    }

    private double profile(String field) {
        Object v = redis.opsForHash().get(RecommendationCacheKeys.profile(userId), field);
        assertThat(v).as("프로파일 필드 " + field).isNotNull();
        return Double.parseDouble(v.toString());
    }

    private NewsItem newsItem(String articleId, String... keywords) {
        NewsItem item = new NewsItem();
        ReflectionTestUtils.setField(item, "articleId", articleId);
        ReflectionTestUtils.setField(item, "title", "기사 " + articleId);
        ReflectionTestUtils.setField(item, "source", "TestSource");
        ReflectionTestUtils.setField(item, "region", "GLOBAL");
        ReflectionTestUtils.setField(item, "category", "AI");
        ReflectionTestUtils.setField(item, "sentiment", "POSITIVE");
        ReflectionTestUtils.setField(item, "score", BigDecimal.valueOf(0.8));
        ReflectionTestUtils.setField(item, "keywords", keywords.length > 0 ? keywords : new String[]{"AI"});
        ReflectionTestUtils.setField(item, "publishedAt", LocalDateTime.now().minusHours(1));
        ReflectionTestUtils.setField(item, "isActive", true);
        return item;
    }
}
