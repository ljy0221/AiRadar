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
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** 추천 계산 1회당 프로파일 읽기 횟수, 그리고 계산 중 프로파일이 바뀌었을 때의 캐시 저장 여부를 검증한다. */
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

    // ─── 계산 중 프로파일 변경 시 캐시 저장 여부 ───────────────────────────────

    @Test
    @DisplayName("뉴스: revision이 계산 전후로 같으면 결과를 캐시에 저장")
    void getPersonalizedFeed_revisionUnchanged_cachesResult() {
        when(hashOps.entries(profileKey)).thenReturn(Map.of("kw:AI", "2.0", "rev", "3"));
        when(hashOps.get(profileKey, "rev")).thenReturn("3");

        recommendationService.getPersonalizedFeed(userId, 20);

        verify(valueOps).set(eq(RecommendationCacheKeys.news(userId)), anyString(), any(Duration.class));
    }

    @Test
    @DisplayName("뉴스: 계산 중 revision이 올라가면 stale 결과를 캐시에 저장하지 않음")
    void getPersonalizedFeed_revisionChangedDuringCompute_doesNotCache() {
        when(hashOps.entries(profileKey)).thenReturn(Map.of("kw:AI", "2.0", "rev", "3"));
        when(hashOps.get(profileKey, "rev")).thenReturn("4");

        recommendationService.getPersonalizedFeed(userId, 20);

        verify(valueOps, never()).set(anyString(), anyString(), any(Duration.class));
    }

    @Test
    @DisplayName("뉴스: revision 필드가 아직 없다가 계산 중 생기면(null → 1) 저장하지 않음")
    void getPersonalizedFeed_revisionAppearsDuringCompute_doesNotCache() {
        when(hashOps.entries(profileKey)).thenReturn(Map.of("kw:AI", "2.0"));
        when(hashOps.get(profileKey, "rev")).thenReturn("1");

        recommendationService.getPersonalizedFeed(userId, 20);

        verify(valueOps, never()).set(anyString(), anyString(), any(Duration.class));
    }

    @Test
    @DisplayName("뉴스: revision 필드가 계산 전후로 모두 없으면(null == null) 저장")
    void getPersonalizedFeed_noRevisionBeforeOrAfter_cachesResult() {
        when(hashOps.entries(profileKey)).thenReturn(Map.of("kw:AI", "2.0"));
        when(hashOps.get(profileKey, "rev")).thenReturn(null);

        recommendationService.getPersonalizedFeed(userId, 20);

        verify(valueOps).set(eq(RecommendationCacheKeys.news(userId)), anyString(), any(Duration.class));
    }

    @Test
    @DisplayName("뉴스: revision 확인이 실패하면 결과는 반환하되 캐시에는 저장하지 않음")
    void getPersonalizedFeed_revisionCheckFails_returnsResultWithoutCaching() {
        when(hashOps.entries(profileKey)).thenReturn(Map.of("kw:AI", "2.0"));
        when(hashOps.get(profileKey, "rev")).thenThrow(new RedisConnectionFailureException("boom"));

        var result = recommendationService.getPersonalizedFeed(userId, 20);

        org.assertj.core.api.Assertions.assertThat(result).hasSize(1);
        verify(valueOps, never()).set(anyString(), anyString(), any(Duration.class));
    }

    @Test
    @DisplayName("논문: revision이 계산 전후로 같으면 결과를 캐시에 저장")
    void getPersonalizedPapers_revisionUnchanged_cachesResult() {
        when(hashOps.entries(profileKey)).thenReturn(Map.of("kw:llm", "2.0", "rev", "7"));
        when(hashOps.get(profileKey, "rev")).thenReturn("7");

        recommendationService.getPersonalizedPapers(userId, 20);

        verify(valueOps).set(eq(RecommendationCacheKeys.paper(userId)), anyString(), any(Duration.class));
    }

    @Test
    @DisplayName("논문: 계산 중 revision이 올라가면 stale 결과를 캐시에 저장하지 않음")
    void getPersonalizedPapers_revisionChangedDuringCompute_doesNotCache() {
        when(hashOps.entries(profileKey)).thenReturn(Map.of("kw:llm", "2.0", "rev", "7"));
        when(hashOps.get(profileKey, "rev")).thenReturn("8");

        recommendationService.getPersonalizedPapers(userId, 20);

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
