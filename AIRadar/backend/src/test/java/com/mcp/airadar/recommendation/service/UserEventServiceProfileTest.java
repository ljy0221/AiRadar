package com.mcp.airadar.recommendation.service;

import com.mcp.airadar.news.entity.NewsItem;
import com.mcp.airadar.news.repository.NewsRepository;
import com.mcp.airadar.paper.repository.PaperRepository;
import com.mcp.airadar.recommendation.entity.SearchLog;
import com.mcp.airadar.recommendation.repository.SearchLogRepository;
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
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.anyDouble;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.startsWith;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** 북마크 시 반영 내용을 기록하고, 삭제 시 기록된 만큼만 프로파일에서 되돌리는지를 검증한다. */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class UserEventServiceProfileTest {

    @Mock private StringRedisTemplate redisTemplate;
    @Mock private SearchLogRepository searchLogRepository;
    @Mock private NewsRepository newsRepository;
    @Mock private PaperRepository paperRepository;
    @Mock private HashOperations<String, Object, Object> hashOps;

    @InjectMocks
    private UserEventService userEventService;

    private static final String SEP = "\u001f";

    private UUID userId;
    private String profileKey;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        profileKey = RecommendationCacheKeys.profile(userId);
        when(redisTemplate.opsForHash()).thenReturn(hashOps);
        when(newsRepository.findByArticleIdAndIsActiveTrue(anyString())).thenReturn(Optional.empty());
        when(paperRepository.findByPaperIdAndIsActiveTrue(anyString())).thenReturn(Optional.empty());
    }

    // ─── 북마크 시 프로파일이 반영한 내용을 기록 ─────────────────────────────────

    @Test
    @DisplayName("북마크: 반영 횟수(bm:)와 그때 반영한 키워드(bmkw:)를 프로파일에 기록")
    void onArticleBookmarked_recordsCountAndCreditedKeywords() {
        when(newsRepository.findByArticleIdAndIsActiveTrue("art-1"))
                .thenReturn(Optional.of(newsItemWithKeywords("AI", "GPU")));

        userEventService.onArticleBookmarked(userId, "art-1");

        verify(hashOps).increment(profileKey, "bm:art-1", 1L);
        verify(hashOps).put(profileKey, "bmkw:art-1", "AI" + SEP + "GPU");
    }

    @Test
    @DisplayName("북마크: 기록 저장이 실패해도 캐시 무효화와 이벤트 로그 저장은 수행")
    void onArticleBookmarked_recordFails_stillInvalidatesAndSavesLog() {
        when(hashOps.increment(profileKey, "bm:art-1", 1L))
                .thenThrow(new RedisConnectionFailureException("boom"));

        userEventService.onArticleBookmarked(userId, "art-1");

        verify(redisTemplate).delete(RecommendationCacheKeys.news(userId));
        verify(searchLogRepository).save(any(SearchLog.class));
    }

    // ─── 북마크 삭제 시 프로파일 되돌리기 (기록된 만큼만) ─────────────────────────

    @Test
    @DisplayName("북마크 삭제: 기록된 횟수만큼 art:와 기록해 둔 키워드를 5.0씩 빼고, 기록을 정리")
    void onBookmarkRemoved_reversesRecordedContribution() {
        when(hashOps.get(profileKey, "bmkw:art-1")).thenReturn("AI" + SEP + "GPU");
        when(hashOps.increment(profileKey, "bm:art-1", -1L)).thenReturn(0L);          // 기록 1건 → 모두 소진
        when(hashOps.increment(eq(profileKey), eq("art:art-1"), eq(-5.0))).thenReturn(0.0);
        when(hashOps.increment(eq(profileKey), eq("kw:AI"), eq(-5.0))).thenReturn(8.0);
        when(hashOps.increment(eq(profileKey), eq("kw:GPU"), eq(-5.0))).thenReturn(2.0);

        userEventService.onBookmarkRemoved(userId, "art-1", 1);

        verify(hashOps).increment(profileKey, "art:art-1", -5.0);
        verify(hashOps).increment(profileKey, "kw:AI", -5.0);
        verify(hashOps).increment(profileKey, "kw:GPU", -5.0);
        verify(hashOps).delete(profileKey, "art:art-1");                  // 0이 된 필드는 제거
        verify(hashOps, never()).delete(profileKey, "kw:AI");             // 다른 이벤트로 쌓인 값은 유지
        verify(hashOps).delete(profileKey, "bm:art-1", "bmkw:art-1");     // 소진된 기록 정리
    }

    @Test
    @DisplayName("북마크 삭제: 삭제 시점의 기사 키워드가 아니라 북마크 시점에 기록한 키워드를 사용")
    void onBookmarkRemoved_usesKeywordsRecordedAtBookmarkTime() {
        when(hashOps.get(profileKey, "bmkw:art-1")).thenReturn("OLD");
        when(hashOps.increment(profileKey, "bm:art-1", -1L)).thenReturn(0L);
        when(newsRepository.findByArticleIdAndIsActiveTrue("art-1"))
                .thenReturn(Optional.of(newsItemWithKeywords("NEW")));   // 이후 기사 키워드가 바뀜

        userEventService.onBookmarkRemoved(userId, "art-1", 1);

        verify(hashOps).increment(profileKey, "kw:OLD", -5.0);
        verify(hashOps, never()).increment(profileKey, "kw:NEW", -5.0);
    }

    @Test
    @DisplayName("북마크 삭제: 같은 기사를 여러 번 북마크했고 모두 기록돼 있으면 횟수만큼 뺌")
    void onBookmarkRemoved_multipleRecordedBookmarks_subtractsPerBookmark() {
        when(hashOps.increment(profileKey, "bm:art-1", -3L)).thenReturn(0L);

        userEventService.onBookmarkRemoved(userId, "art-1", 3);

        verify(hashOps).increment(profileKey, "art:art-1", -15.0);
    }

    @Test
    @DisplayName("북마크 삭제: 기록된 것보다 많이 요청되면 기록된 만큼만 되돌리고 초과 차감분은 복구")
    void onBookmarkRemoved_requestedMoreThanRecorded_clampsToRecorded() {
        when(hashOps.increment(profileKey, "bm:art-1", -3L)).thenReturn(-2L);        // 기록은 1건뿐이었음

        userEventService.onBookmarkRemoved(userId, "art-1", 3);

        verify(hashOps).increment(profileKey, "bm:art-1", 2L);                       // 초과분 복구
        verify(hashOps).increment(profileKey, "art:art-1", -5.0);                    // 기록된 1건만큼만
        verify(hashOps, never()).increment(profileKey, "art:art-1", -15.0);
    }

    @Test
    @DisplayName("북마크 삭제: 기록이 없으면(프로파일 만료·이전 북마크) 프로파일도 캐시도 건드리지 않음")
    void onBookmarkRemoved_nothingRecorded_leavesProfileAndCacheUntouched() {
        when(hashOps.increment(profileKey, "bm:art-1", -1L)).thenReturn(-1L);        // 필드가 없어서 -1이 됨

        userEventService.onBookmarkRemoved(userId, "art-1", 1);

        verify(hashOps).increment(profileKey, "bm:art-1", 1L);                       // 만들어진 음수 값 복구
        verify(hashOps).delete(profileKey, "bm:art-1", "bmkw:art-1");                // 잔여 필드 정리
        verify(hashOps, never()).increment(eq(profileKey), startsWith("art:"), anyDouble());
        verify(hashOps, never()).increment(eq(profileKey), startsWith("kw:"), anyDouble());
        verify(redisTemplate, never()).delete(anyString());
        verify(hashOps, never()).increment(profileKey, "rev", 1L);
    }

    @Test
    @DisplayName("북마크 삭제: 되돌린 뒤 뉴스·논문 추천 캐시를 무효화하고 rev를 올림")
    void onBookmarkRemoved_invalidatesCaches() {
        when(hashOps.increment(profileKey, "bm:art-1", -1L)).thenReturn(0L);

        userEventService.onBookmarkRemoved(userId, "art-1", 1);

        verify(redisTemplate).delete(RecommendationCacheKeys.news(userId));
        verify(redisTemplate).delete(RecommendationCacheKeys.paper(userId));
        verify(hashOps, times(2)).increment(profileKey, "rev", 1L);
    }

    @Test
    @DisplayName("북마크 삭제: 되돌리는 도중 실패해도 추천 캐시는 무효화 (부분 차감된 상태로 캐시가 남지 않도록)")
    void onBookmarkRemoved_failureMidway_stillInvalidatesCaches() {
        when(hashOps.increment(profileKey, "bm:art-1", -1L)).thenReturn(0L);
        when(hashOps.increment(eq(profileKey), eq("art:art-1"), eq(-5.0)))
                .thenThrow(new RedisConnectionFailureException("boom"));

        userEventService.onBookmarkRemoved(userId, "art-1", 1);

        verify(redisTemplate).delete(RecommendationCacheKeys.news(userId));
        verify(redisTemplate).delete(RecommendationCacheKeys.paper(userId));
    }

    @Test
    @DisplayName("북마크 삭제: 삭제된 이벤트가 없거나 비로그인이면 아무것도 하지 않음")
    void onBookmarkRemoved_nothingRemovedOrAnonymous_isNoOp() {
        userEventService.onBookmarkRemoved(userId, "art-1", 0);
        userEventService.onBookmarkRemoved(null, "art-1", 1);

        verify(hashOps, never()).increment(anyString(), any(), anyLong());
        verify(hashOps, never()).increment(anyString(), any(), anyDouble());
        verify(redisTemplate, never()).delete(anyString());
    }

    @Test
    @DisplayName("북마크 삭제: Redis 실패는 예외로 전파하지 않음 (북마크 삭제 자체는 성공)")
    void onBookmarkRemoved_redisFailure_isSwallowed() {
        when(hashOps.increment(profileKey, "bm:art-1", -1L))
                .thenThrow(new RedisConnectionFailureException("boom"));

        assertThatCode(() -> userEventService.onBookmarkRemoved(userId, "art-1", 1)).doesNotThrowAnyException();
    }

    private NewsItem newsItemWithKeywords(String... keywords) {
        NewsItem item = new NewsItem();
        ReflectionTestUtils.setField(item, "articleId", "art-1");
        ReflectionTestUtils.setField(item, "keywords", keywords);
        return item;
    }
}
