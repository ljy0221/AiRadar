package com.mcp.airadar.recommendation.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mcp.airadar.news.entity.NewsItem;
import com.mcp.airadar.news.repository.NewsRepository;
import com.mcp.airadar.recommendation.dto.RecommendationDto;
import com.mcp.airadar.recommendation.entity.UserRecommendation;
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
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class RecommendationServiceTest {

    @Mock private StringRedisTemplate redisTemplate;
    @Mock private NewsRepository newsRepository;
    @Mock private UserRecommendationRepository userRecommendationRepository;
    @Mock private ValueOperations<String, String> valueOps;
    @Mock private HashOperations<String, Object, Object> hashOps;

    @InjectMocks
    private RecommendationService recommendationService;

    private UUID userId;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        when(redisTemplate.opsForValue()).thenReturn(valueOps);
        when(redisTemplate.opsForHash()).thenReturn(hashOps);
    }

    // ─── 캐시 히트 ────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Redis 캐시가 있으면 DB 조회 없이 캐시 결과 반환")
    void getPersonalizedFeed_cacheHit_skipDbQuery() throws Exception {
        // given
        String cachedJson = "[{\"articleId\":\"art-001\",\"title\":\"cached\",\"source\":\"TechCrunch\"," +
                "\"region\":\"GLOBAL\",\"category\":\"AI\",\"sentiment\":\"POSITIVE\"," +
                "\"score\":0.9,\"keywords\":[\"AI\"],\"publishedAt\":\"2026-03-20T09:00:00\",\"reason\":\"KEYWORD_MATCH\"}]";

        when(valueOps.get(anyString())).thenReturn(cachedJson);

        // RecommendationService의 ObjectMapper는 @InjectMocks가 null로 주입 → 실제 인스턴스 설정
        ReflectionTestUtils.setField(recommendationService, "objectMapper", new ObjectMapper()
                .findAndRegisterModules());

        // when
        List<RecommendationDto.NewsItem> result = recommendationService.getPersonalizedFeed(userId, 20);

        // then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).articleId()).isEqualTo("art-001");
        verify(userRecommendationRepository, never()).findValidByUserId(any(), any());
        verify(newsRepository, never()).findByKeywordsOverlap(anyString(), any(), anyInt());
    }

    // ─── Cold Start ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("캐시도 ALS도 프로파일도 없으면 Cold Start 인기 기사 반환")
    void getPersonalizedFeed_noDataAtAll_returnsColdStart() {
        // given
        when(valueOps.get(anyString())).thenReturn(null);
        when(userRecommendationRepository.findValidByUserId(any(), any())).thenReturn(List.of());
        when(hashOps.entries(anyString())).thenReturn(Map.of());

        NewsItem popular = buildNewsItem("art-hot", "인기 기사");
        when(newsRepository.findTop20ByIsActiveTrueOrderByScoreDescPublishedAtDesc())
                .thenReturn(List.of(popular));

        ReflectionTestUtils.setField(recommendationService, "objectMapper", new ObjectMapper()
                .findAndRegisterModules());

        // when
        List<RecommendationDto.NewsItem> result = recommendationService.getPersonalizedFeed(userId, 20);

        // then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).reason()).isEqualTo("COLD_START");
        assertThat(result.get(0).articleId()).isEqualTo("art-hot");
    }

    // ─── 키워드 매칭 ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("ALS 없이 키워드 프로파일만 있으면 KEYWORD_MATCH 기사 반환")
    void getPersonalizedFeed_keywordOnly_returnsKeywordMatchItems() {
        // given
        when(valueOps.get(anyString())).thenReturn(null);
        when(userRecommendationRepository.findValidByUserId(any(), any())).thenReturn(List.of());
        when(hashOps.entries(anyString())).thenReturn(Map.of("kw:AI", "2.0", "kw:GPU", "1.5"));

        NewsItem article = buildNewsItem("art-kw", "AI 관련 기사");
        when(newsRepository.findByKeywordsOverlap(anyString(), any(), anyInt()))
                .thenReturn(List.of(article));

        ReflectionTestUtils.setField(recommendationService, "objectMapper", new ObjectMapper()
                .findAndRegisterModules());

        // when
        List<RecommendationDto.NewsItem> result = recommendationService.getPersonalizedFeed(userId, 20);

        // then
        assertThat(result).hasSize(1);
        assertThat(result.get(0).reason()).isEqualTo("KEYWORD_MATCH");
    }

    // ─── ALS + 키워드 결합 ────────────────────────────────────────────────────

    @Test
    @DisplayName("ALS 추천과 키워드 매칭이 모두 있으면 중복 없이 결합 반환")
    void getPersonalizedFeed_alsAndKeyword_mergesWithoutDuplicates() {
        // given
        when(valueOps.get(anyString())).thenReturn(null);

        UserRecommendation alsRec = buildAlsRecommendation("art-als", 0.85);
        when(userRecommendationRepository.findValidByUserId(any(), any()))
                .thenReturn(List.of(alsRec));

        when(hashOps.entries(anyString())).thenReturn(Map.of("kw:AI", "2.0"));

        NewsItem kwArticle = buildNewsItem("art-kw", "키워드 매칭 기사");
        when(newsRepository.findByKeywordsOverlap(anyString(), any(), anyInt()))
                .thenReturn(List.of(kwArticle));

        NewsItem alsArticle = buildNewsItem("art-als", "ALS 추천 기사");
        when(newsRepository.findAllById(any())).thenReturn(List.of(alsArticle));

        ReflectionTestUtils.setField(recommendationService, "objectMapper", new ObjectMapper()
                .findAndRegisterModules());

        // when
        List<RecommendationDto.NewsItem> result = recommendationService.getPersonalizedFeed(userId, 20);

        // then
        assertThat(result).hasSize(2);
        // articleId 중복 없음
        long distinctIds = result.stream().map(RecommendationDto.NewsItem::articleId).distinct().count();
        assertThat(distinctIds).isEqualTo(2);
        // ALS 기사는 reason = "ALS"
        assertThat(result).anyMatch(r -> r.articleId().equals("art-als") && r.reason().equals("ALS"));
        // 키워드 기사는 reason = "KEYWORD_MATCH"
        assertThat(result).anyMatch(r -> r.articleId().equals("art-kw") && r.reason().equals("KEYWORD_MATCH"));
    }

    // ─── size 상한 ────────────────────────────────────────────────────────────

    @Test
    @DisplayName("size=100 요청 시 최대 50개로 제한됨")
    void getPersonalizedFeed_sizeExceedsMax_cappedAt50() {
        // given
        when(valueOps.get(anyString())).thenReturn(null);
        when(userRecommendationRepository.findValidByUserId(any(), any())).thenReturn(List.of());
        when(hashOps.entries(anyString())).thenReturn(Map.of());

        List<NewsItem> popularItems = java.util.stream.IntStream.range(0, 60)
                .mapToObj(i -> buildNewsItem("art-" + i, "기사 " + i))
                .toList();
        when(newsRepository.findTop20ByIsActiveTrueOrderByScoreDescPublishedAtDesc())
                .thenReturn(popularItems);

        ReflectionTestUtils.setField(recommendationService, "objectMapper", new ObjectMapper()
                .findAndRegisterModules());

        // when
        List<RecommendationDto.NewsItem> result = recommendationService.getPersonalizedFeed(userId, 100);

        // then
        assertThat(result.size()).isLessThanOrEqualTo(50);
    }

    // ─── 헬퍼 ─────────────────────────────────────────────────────────────────

    private NewsItem buildNewsItem(String articleId, String title) {
        NewsItem item = new NewsItem();
        ReflectionTestUtils.setField(item, "articleId", articleId);
        ReflectionTestUtils.setField(item, "title", title);
        ReflectionTestUtils.setField(item, "source", "TestSource");
        ReflectionTestUtils.setField(item, "region", "GLOBAL");
        ReflectionTestUtils.setField(item, "category", "AI");
        ReflectionTestUtils.setField(item, "sentiment", "POSITIVE");
        ReflectionTestUtils.setField(item, "score", BigDecimal.valueOf(0.8));
        ReflectionTestUtils.setField(item, "keywords", new String[]{"AI", "GPU"});
        ReflectionTestUtils.setField(item, "publishedAt", LocalDateTime.now().minusHours(1));
        ReflectionTestUtils.setField(item, "isActive", true);
        return item;
    }

    private UserRecommendation buildAlsRecommendation(String articleId, double score) {
        UserRecommendation rec = new UserRecommendation();
        ReflectionTestUtils.setField(rec, "userId", userId);
        ReflectionTestUtils.setField(rec, "articleId", articleId);
        ReflectionTestUtils.setField(rec, "score", BigDecimal.valueOf(score));
        ReflectionTestUtils.setField(rec, "expiresAt", LocalDateTime.now().plusHours(12));
        return rec;
    }
}
