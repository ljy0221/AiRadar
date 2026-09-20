package com.mcp.airadar.recommendation.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mcp.airadar.news.entity.NewsItem;
import com.mcp.airadar.news.repository.NewsRepository;
import com.mcp.airadar.paper.entity.Paper;
import com.mcp.airadar.paper.repository.PaperRepository;
import com.mcp.airadar.recommendation.repository.UserRecommendationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** 추천 계산 1회당 프로파일 읽기 횟수, 그리고 캐시를 원자적 compare-and-set으로 저장하는지를 검증한다. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class RecommendationServiceCacheWriteGuardTest {

    @Mock private StringRedisTemplate redisTemplate;
    @Mock private NewsRepository newsRepository;
    @Mock private PaperRepository paperRepository;
    @Mock private UserRecommendationRepository userRecommendationRepository;
    @Mock private ValueOperations<String, String> valueOps;
    @Mock private HashOperations<String, Object, Object> hashOps;

    @InjectMocks
    private RecommendationService recommendationService;

    private UUID userId;
    private String profileKey;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        profileKey = RecommendationCacheKeys.profile(userId);
        when(redisTemplate.opsForValue()).thenReturn(valueOps);
        when(redisTemplate.opsForHash()).thenReturn(hashOps);
        when(valueOps.get(anyString())).thenReturn(null);
        when(userRecommendationRepository.findValidByUserId(any(), any())).thenReturn(List.of());
        when(userRecommendationRepository.findValidByUserIdAndContentType(any(), anyString(), any()))
                .thenReturn(List.of());
        when(newsRepository.findByKeywordsOverlap(anyString(), any(), anyInt()))
                .thenReturn(List.of(newsItem()));
        when(paperRepository.findByKeywordsOverlap(anyString(), any(), anyInt()))
                .thenReturn(List.of(paper()));
        ReflectionTestUtils.setField(recommendationService, "objectMapper",
                new ObjectMapper().findAndRegisterModules());
    }

    // ─── 프로파일 읽기 횟수 ───────────────────────────────────────────────────

    @Test
    @DisplayName("뉴스 추천 1회 계산에서 프로파일 Hash를 한 번만 읽음")
    void getPersonalizedFeed_readsProfileOnce() {
        when(hashOps.entries(profileKey)).thenReturn(Map.of("kw:AI", "2.0", "art:seen", "1.0"));

        recommendationService.getPersonalizedFeed(userId, 20);

        verify(hashOps, times(1)).entries(anyString());
    }

    @Test
    @DisplayName("논문 추천 1회 계산에서 프로파일 Hash를 한 번만 읽음")
    void getPersonalizedPapers_readsProfileOnce() {
        when(hashOps.entries(profileKey)).thenReturn(Map.of("kw:llm", "2.0", "ppv:seen", "1.0"));

        recommendationService.getPersonalizedPapers(userId, 20);

        verify(hashOps, times(1)).entries(anyString());
    }

    // ─── 캐시 저장: 프로파일 revision이 그대로일 때만 저장 (Redis 안에서 원자적으로) ───────

    @Test
    @DisplayName("뉴스: 계산 시작 시점의 rev를 인자로 넘겨 원자적 저장을 요청하고, 직접 SET은 하지 않음")
    void getPersonalizedFeed_storesAtomicallyWithRevisionSeenAtStart() {
        when(hashOps.entries(profileKey)).thenReturn(Map.of("kw:AI", "2.0", "rev", "3"));

        recommendationService.getPersonalizedFeed(userId, 20);

        verify(redisTemplate).execute(any(RedisScript.class),
                eq(List.of(profileKey, RecommendationCacheKeys.news(userId))),
                eq("rev"), eq("3"), anyString(), eq("1800000"));
        verify(valueOps, never()).set(anyString(), anyString(), any(Duration.class));
    }

    @Test
    @DisplayName("뉴스: 계산 시작 시점에 rev가 없었으면 빈 문자열을 넘김 (없음 → 없음이면 저장, 없음 → 생김이면 건너뜀)")
    void getPersonalizedFeed_noRevisionAtStart_sendsEmptyString() {
        when(hashOps.entries(profileKey)).thenReturn(Map.of("kw:AI", "2.0"));

        recommendationService.getPersonalizedFeed(userId, 20);

        verify(redisTemplate).execute(any(RedisScript.class),
                eq(List.of(profileKey, RecommendationCacheKeys.news(userId))),
                eq("rev"), eq(""), anyString(), eq("1800000"));
    }

    @Test
    @DisplayName("뉴스: 원자적 저장 실행이 실패해도 결과는 반환하고 직접 SET으로 우회하지 않음")
    void getPersonalizedFeed_atomicStoreFails_returnsResultWithoutFallbackSet() {
        when(hashOps.entries(profileKey)).thenReturn(Map.of("kw:AI", "2.0"));
        when(redisTemplate.execute(any(RedisScript.class), anyList(), any(), any(), any(), any()))
                .thenThrow(new RedisConnectionFailureException("boom"));

        var result = recommendationService.getPersonalizedFeed(userId, 20);

        assertThat(result).hasSize(1);
        verify(valueOps, never()).set(anyString(), anyString(), any(Duration.class));
    }

    @Test
    @DisplayName("뉴스: 계산 중 프로파일이 바뀌어 저장이 건너뛰어져도(0 반환) 결과는 정상 반환")
    void getPersonalizedFeed_storeSkipped_stillReturnsResult() {
        when(hashOps.entries(profileKey)).thenReturn(Map.of("kw:AI", "2.0", "rev", "3"));
        when(redisTemplate.execute(any(RedisScript.class), anyList(), any(), any(), any(), any()))
                .thenReturn(0L);

        var result = recommendationService.getPersonalizedFeed(userId, 20);

        assertThat(result).hasSize(1);
    }

    @Test
    @DisplayName("논문: 계산 시작 시점의 rev를 인자로 넘겨 원자적 저장을 요청하고, 직접 SET은 하지 않음")
    void getPersonalizedPapers_storesAtomicallyWithRevisionSeenAtStart() {
        when(hashOps.entries(profileKey)).thenReturn(Map.of("kw:llm", "2.0", "rev", "7"));

        recommendationService.getPersonalizedPapers(userId, 20);

        verify(redisTemplate).execute(any(RedisScript.class),
                eq(List.of(profileKey, RecommendationCacheKeys.paper(userId))),
                eq("rev"), eq("7"), anyString(), eq("1800000"));
        verify(valueOps, never()).set(anyString(), anyString(), any(Duration.class));
    }

    // ─── 헬퍼 ─────────────────────────────────────────────────────────────────

    private NewsItem newsItem() {
        NewsItem item = new NewsItem();
        ReflectionTestUtils.setField(item, "articleId", "art-1");
        ReflectionTestUtils.setField(item, "title", "AI 기사");
        ReflectionTestUtils.setField(item, "source", "TestSource");
        ReflectionTestUtils.setField(item, "region", "GLOBAL");
        ReflectionTestUtils.setField(item, "category", "AI");
        ReflectionTestUtils.setField(item, "sentiment", "POSITIVE");
        ReflectionTestUtils.setField(item, "score", BigDecimal.valueOf(0.8));
        ReflectionTestUtils.setField(item, "keywords", new String[]{"AI"});
        ReflectionTestUtils.setField(item, "publishedAt", LocalDateTime.now().minusHours(1));
        ReflectionTestUtils.setField(item, "isActive", true);
        return item;
    }

    private Paper paper() {
        Paper p = new Paper();
        ReflectionTestUtils.setField(p, "paperId", "p-1");
        ReflectionTestUtils.setField(p, "title", "LLM 논문");
        ReflectionTestUtils.setField(p, "keywords", new String[]{"llm"});
        ReflectionTestUtils.setField(p, "category", "NLP");
        ReflectionTestUtils.setField(p, "researchArea", "cs.CL");
        ReflectionTestUtils.setField(p, "publishedAt", LocalDateTime.now().minusDays(1));
        ReflectionTestUtils.setField(p, "isActive", true);
        return p;
    }
}
