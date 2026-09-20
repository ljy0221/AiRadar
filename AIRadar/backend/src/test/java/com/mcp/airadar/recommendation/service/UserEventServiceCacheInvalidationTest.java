package com.mcp.airadar.recommendation.service;

import com.mcp.airadar.news.repository.NewsRepository;
import com.mcp.airadar.paper.repository.PaperRepository;
import com.mcp.airadar.recommendation.entity.SearchLog;
import com.mcp.airadar.recommendation.repository.SearchLogRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.data.redis.RedisConnectionFailureException;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.time.Duration;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class UserEventServiceCacheInvalidationTest {

    @Mock private StringRedisTemplate redisTemplate;
    @Mock private SearchLogRepository searchLogRepository;
    @Mock private NewsRepository newsRepository;
    @Mock private PaperRepository paperRepository;
    @Mock private HashOperations<String, Object, Object> hashOps;

    @InjectMocks
    private UserEventService userEventService;

    private UUID userId;
    private String newsCacheKey;
    private String paperCacheKey;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        newsCacheKey = "user:" + userId + ":recommendations";
        paperCacheKey = "user:" + userId + ":paper-recommendations";
        when(redisTemplate.opsForHash()).thenReturn(hashOps);
        when(newsRepository.findByArticleIdAndIsActiveTrue(anyString())).thenReturn(Optional.empty());
        when(paperRepository.findByPaperIdAndIsActiveTrue(anyString())).thenReturn(Optional.empty());
    }

    @Test
    @DisplayName("논문 조회 시 논문 추천 캐시만 삭제하고 뉴스 추천 캐시는 유지")
    void onPaperViewed_invalidatesOnlyPaperCache() {
        userEventService.onPaperViewed(userId, "paper-001", 40);

        verify(redisTemplate).delete(paperCacheKey);
        verify(redisTemplate, never()).delete(newsCacheKey);
    }

    @Test
    @DisplayName("논문 조회 시 프로파일(ppv:) 기록 이후에 캐시를 삭제 (순서가 바뀌면 stale 재캐싱 발생)")
    void onPaperViewed_invalidatesAfterProfileWrite() {
        userEventService.onPaperViewed(userId, "paper-001", 40);

        InOrder inOrder = inOrder(hashOps, redisTemplate);
        inOrder.verify(hashOps).increment(anyString(), eq("ppv:paper-001"), eq(1.0));
        inOrder.verify(redisTemplate).delete(paperCacheKey);
    }

    @Test
    @DisplayName("캐시 삭제가 실패해도 프로파일 TTL 갱신과 이벤트 로그 저장은 수행")
    void onPaperViewed_deleteFails_stillRefreshesTtlAndSavesLog() {
        when(redisTemplate.delete(paperCacheKey))
                .thenThrow(new RedisConnectionFailureException("boom"));

        userEventService.onPaperViewed(userId, "paper-001", 40);

        verify(redisTemplate).expire(eq("user:" + userId + ":profile"), any(Duration.class));
        verify(searchLogRepository).save(any(SearchLog.class));
    }

    @Test
    @DisplayName("북마크 시 뉴스와 논문 추천 캐시를 모두 삭제")
    void onArticleBookmarked_invalidatesNewsAndPaperCache() {
        userEventService.onArticleBookmarked(userId, "art-001");

        verify(redisTemplate).delete(newsCacheKey);
        verify(redisTemplate).delete(paperCacheKey);
    }

    @Test
    @DisplayName("비로그인(userId null) 논문 조회는 캐시 삭제를 시도하지 않음")
    void onPaperViewed_anonymous_doesNotTouchCache() {
        userEventService.onPaperViewed(null, "paper-001", 40);

        verify(redisTemplate, never()).delete(anyString());
    }

    @Test
    @DisplayName("기사 조회 시 뉴스 추천 캐시만 삭제하고 논문 추천 캐시는 유지")
    void onArticleViewed_invalidatesOnlyNewsCache() {
        userEventService.onArticleViewed(userId, "art-001", 40);

        verify(redisTemplate).delete(newsCacheKey);
        verify(redisTemplate, never()).delete(paperCacheKey);
    }

    @Test
    @DisplayName("기사 조회 시 프로파일(art:) 기록 이후에 뉴스 캐시를 삭제")
    void onArticleViewed_invalidatesAfterProfileWrite() {
        userEventService.onArticleViewed(userId, "art-001", 40);

        InOrder inOrder = inOrder(hashOps, redisTemplate);
        inOrder.verify(hashOps).increment(anyString(), eq("art:art-001"), eq(1.0));
        inOrder.verify(redisTemplate).delete(newsCacheKey);
    }

    @Test
    @DisplayName("비로그인(userId null) 기사 조회는 캐시 삭제를 시도하지 않음")
    void onArticleViewed_anonymous_doesNotTouchCache() {
        userEventService.onArticleViewed(null, "art-001", 40);

        verify(redisTemplate, never()).delete(anyString());
    }

    @Test
    @DisplayName("뉴스 캐시 삭제가 실패해도 이벤트 로그 저장은 수행")
    void onArticleViewed_deleteFails_stillSavesLog() {
        when(redisTemplate.delete(newsCacheKey))
                .thenThrow(new RedisConnectionFailureException("boom"));

        userEventService.onArticleViewed(userId, "art-001", 40);

        verify(searchLogRepository).save(any(SearchLog.class));
    }

    @Test
    @DisplayName("북마크 시 뉴스 캐시 삭제가 실패해도 논문 캐시 삭제와 이벤트 로그 저장은 수행")
    void onArticleBookmarked_newsDeleteFails_stillInvalidatesPaperAndSavesLog() {
        when(redisTemplate.delete(newsCacheKey))
                .thenThrow(new RedisConnectionFailureException("boom"));

        userEventService.onArticleBookmarked(userId, "art-001");

        verify(redisTemplate).delete(paperCacheKey);
        verify(searchLogRepository).save(any(SearchLog.class));
    }
}
