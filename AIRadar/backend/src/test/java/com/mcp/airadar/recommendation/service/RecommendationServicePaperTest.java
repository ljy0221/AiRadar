package com.mcp.airadar.recommendation.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mcp.airadar.news.repository.NewsRepository;
import com.mcp.airadar.paper.entity.Paper;
import com.mcp.airadar.paper.repository.PaperRepository;
import com.mcp.airadar.recommendation.dto.RecommendationDto;
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

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class RecommendationServicePaperTest {

    @Mock private StringRedisTemplate redisTemplate;
    @Mock private NewsRepository newsRepository;
    @Mock private PaperRepository paperRepository;
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
        ReflectionTestUtils.setField(recommendationService, "objectMapper",
                new ObjectMapper().findAndRegisterModules());
    }

    // ─── 논문 추천 Cold Start ─────────────────────────────────────────────────

    @Test
    @DisplayName("키워드 프로파일 없으면 최신 논문 Cold Start 반환")
    void getPersonalizedPapers_noProfile_returnsColdStart() {
        when(valueOps.get(anyString())).thenReturn(null);
        when(hashOps.entries(anyString())).thenReturn(Map.of());

        Paper paper = buildPaper("p-001", "Attention Is All You Need");
        when(paperRepository.findTop20ByIsActiveTrueOrderByPublishedAtDesc())
                .thenReturn(List.of(paper));

        List<RecommendationDto.PaperItem> result =
                recommendationService.getPersonalizedPapers(userId, 20);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).paperId()).isEqualTo("p-001");
        assertThat(result.get(0).reason()).isEqualTo("COLD_START");
    }

    @Test
    @DisplayName("키워드 프로파일 있으면 KEYWORD_MATCH 논문 반환")
    void getPersonalizedPapers_withKeywords_returnsKeywordMatch() {
        when(valueOps.get(anyString())).thenReturn(null);
        when(hashOps.entries(anyString())).thenReturn(Map.of("kw:transformer", "3.0", "kw:llm", "2.0"));

        Paper paper = buildPaper("p-kw", "Transformer Survey");
        when(paperRepository.findByKeywordsOverlap(anyString(), any(), anyInt()))
                .thenReturn(List.of(paper));

        List<RecommendationDto.PaperItem> result =
                recommendationService.getPersonalizedPapers(userId, 20);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).reason()).isEqualTo("KEYWORD_MATCH");
        assertThat(result.get(0).paperId()).isEqualTo("p-kw");
    }

    @Test
    @DisplayName("이미 본 논문(ppv: 필드)은 추천에서 제외")
    void getPersonalizedPapers_viewedPaperExcluded() {
        when(valueOps.get(anyString())).thenReturn(null);
        // ppv:p-viewed → 이미 본 논문
        when(hashOps.entries(anyString())).thenReturn(
                Map.of("kw:llm", "2.0", "ppv:p-viewed", "1.0"));

        Paper viewed = buildPaper("p-viewed", "이미 본 논문");
        Paper fresh  = buildPaper("p-fresh",  "새 논문");
        when(paperRepository.findByKeywordsOverlap(anyString(), any(), anyInt()))
                .thenReturn(List.of(viewed, fresh));

        List<RecommendationDto.PaperItem> result =
                recommendationService.getPersonalizedPapers(userId, 20);

        assertThat(result).extracting(RecommendationDto.PaperItem::paperId)
                .doesNotContain("p-viewed")
                .contains("p-fresh");
    }

    @Test
    @DisplayName("size=100 요청 시 최대 50개로 제한")
    void getPersonalizedPapers_sizeExceedsMax_cappedAt50() {
        when(valueOps.get(anyString())).thenReturn(null);
        when(hashOps.entries(anyString())).thenReturn(Map.of());

        List<Paper> papers = java.util.stream.IntStream.range(0, 60)
                .mapToObj(i -> buildPaper("p-" + i, "논문 " + i))
                .toList();
        when(paperRepository.findTop20ByIsActiveTrueOrderByPublishedAtDesc())
                .thenReturn(papers);

        List<RecommendationDto.PaperItem> result =
                recommendationService.getPersonalizedPapers(userId, 100);

        assertThat(result.size()).isLessThanOrEqualTo(50);
    }

    // ─── 헬퍼 ─────────────────────────────────────────────────────────────────

    private Paper buildPaper(String paperId, String title) {
        Paper p = new Paper();
        ReflectionTestUtils.setField(p, "paperId", paperId);
        ReflectionTestUtils.setField(p, "title", title);
        ReflectionTestUtils.setField(p, "keywords", new String[]{"llm", "transformer"});
        ReflectionTestUtils.setField(p, "category", "NLP");
        ReflectionTestUtils.setField(p, "researchArea", "cs.CL");
        ReflectionTestUtils.setField(p, "publishedAt", LocalDateTime.now().minusDays(1));
        ReflectionTestUtils.setField(p, "isActive", true);
        return p;
    }
}
