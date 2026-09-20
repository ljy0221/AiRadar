package com.mcp.airadar.user.service;

import com.mcp.airadar.auth.entity.User;
import com.mcp.airadar.auth.repository.UserRepository;
import com.mcp.airadar.recommendation.entity.SearchLog;
import com.mcp.airadar.recommendation.repository.SearchLogRepository;
import com.mcp.airadar.recommendation.service.RecommendationCacheKeys;
import com.mcp.airadar.recommendation.service.UserEventService;
import com.mcp.airadar.user.dto.BookmarkHistoryDto;
import com.mcp.airadar.user.dto.OnboardingRequest;
import com.mcp.airadar.user.entity.UserInterest;
import com.mcp.airadar.user.repository.UserInterestRepository;
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
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class UserServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private UserInterestRepository userInterestRepository;
    @Mock private SearchLogRepository searchLogRepository;
    @Mock private UserEventService userEventService;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private StringRedisTemplate redisTemplate;
    @Mock private HashOperations<String, Object, Object> hashOperations;

    @InjectMocks
    private UserService userService;

    private UUID userId;
    private User user;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        user = User.builder()
                .email("test@example.com")
                .password("encoded")
                .name("테스터")
                .build();
        ReflectionTestUtils.setField(user, "id", userId);
        ReflectionTestUtils.setField(user, "onboardingCompleted", false);

        when(redisTemplate.opsForHash()).thenReturn(hashOperations);
    }

    // ─── completeOnboarding ───────────────────────────────────────────────────

    @Test
    @DisplayName("신규 키워드 3개로 온보딩 완료 시 DB 저장 + Redis 반영 + 플래그 설정")
    void completeOnboarding_newKeywords_savesAllAndSetsFlag() {
        // given
        List<String> keywords = List.of("AI", "HBM", "GPU");
        OnboardingRequest request = new OnboardingRequest(keywords);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        when(userInterestRepository.existsByUserIdAndKeyword(eq(userId), anyString()))
                .thenReturn(false);
        when(userInterestRepository.save(any(UserInterest.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        // when
        userService.completeOnboarding(userId, request);

        // then — DB에 3개 저장
        verify(userInterestRepository, times(3)).save(any(UserInterest.class));

        // then — Redis에 3개 키 설정
        verify(hashOperations).putIfAbsent(
                eq(RecommendationCacheKeys.profile(userId)), eq("kw:AI"), eq("1.0"));
        verify(hashOperations).putIfAbsent(
                eq(RecommendationCacheKeys.profile(userId)), eq("kw:HBM"), eq("1.0"));
        verify(hashOperations).putIfAbsent(
                eq(RecommendationCacheKeys.profile(userId)), eq("kw:GPU"), eq("1.0"));

        // then — onboardingCompleted = true
        assertThat(user.isOnboardingCompleted()).isTrue();
    }

    @Test
    @DisplayName("이미 등록된 키워드는 DB 저장 건너뜀, Redis는 여전히 putIfAbsent 호출")
    void completeOnboarding_duplicateKeyword_skipsDbSave() {
        // given
        List<String> keywords = List.of("AI", "HBM");
        OnboardingRequest request = new OnboardingRequest(keywords);

        when(userRepository.findById(userId)).thenReturn(Optional.of(user));
        // "AI"는 이미 존재
        when(userInterestRepository.existsByUserIdAndKeyword(userId, "AI")).thenReturn(true);
        when(userInterestRepository.existsByUserIdAndKeyword(userId, "HBM")).thenReturn(false);
        when(userInterestRepository.save(any(UserInterest.class)))
                .thenAnswer(inv -> inv.getArgument(0));

        // when
        userService.completeOnboarding(userId, request);

        // then — DB 저장은 1번만 (HBM만)
        verify(userInterestRepository, times(1)).save(any(UserInterest.class));

        // then — Redis는 2번 모두 호출
        verify(hashOperations, times(2)).putIfAbsent(anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("이미 온보딩 완료된 사용자는 409 Conflict 예외 발생")
    void completeOnboarding_alreadyCompleted_throws409() {
        // given
        ReflectionTestUtils.setField(user, "onboardingCompleted", true);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        OnboardingRequest request = new OnboardingRequest(List.of("AI"));

        // when & then
        assertThatThrownBy(() -> userService.completeOnboarding(userId, request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("이미 온보딩이 완료된 계정입니다.");

        verify(userInterestRepository, never()).save(any());
    }

    @Test
    @DisplayName("존재하지 않는 userId면 404 예외 발생")
    void completeOnboarding_userNotFound_throws404() {
        // given
        when(userRepository.findById(userId)).thenReturn(Optional.empty());
        OnboardingRequest request = new OnboardingRequest(List.of("AI"));

        // when & then
        assertThatThrownBy(() -> userService.completeOnboarding(userId, request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("사용자를 찾을 수 없습니다.");
    }

    // ─── getBookmarkHistory ───────────────────────────────────────────────────

    @Test
    @DisplayName("북마크 기록이 있을 때 articleId와 occurredAt이 올바르게 매핑되어 반환됨")
    void getBookmarkHistory_hasBookmarks_returnsMappedDtos() {
        // given
        LocalDateTime now = LocalDateTime.now();
        SearchLog log1 = SearchLog.builder()
                .userId(userId).articleId("article-001")
                .eventType("ARTICLE_BOOKMARKED").occurredAt(now.minusHours(2))
                .build();
        SearchLog log2 = SearchLog.builder()
                .userId(userId).articleId("article-002")
                .eventType("ARTICLE_BOOKMARKED").occurredAt(now.minusHours(1))
                .build();

        when(searchLogRepository.findBookmarkHistory(userId)).thenReturn(List.of(log1, log2));

        // when
        List<BookmarkHistoryDto> result = userService.getBookmarkHistory(userId);

        // then
        assertThat(result).hasSize(2);
        assertThat(result.get(0).articleId()).isEqualTo("article-001");
        assertThat(result.get(1).articleId()).isEqualTo("article-002");
        verify(searchLogRepository).findBookmarkHistory(userId);
    }

    @Test
    @DisplayName("북마크 기록이 없으면 빈 리스트 반환")
    void getBookmarkHistory_noBookmarks_returnsEmptyList() {
        // given
        when(searchLogRepository.findBookmarkHistory(userId)).thenReturn(List.of());

        // when
        List<BookmarkHistoryDto> result = userService.getBookmarkHistory(userId);

        // then
        assertThat(result).isEmpty();
    }

    // ─── deleteBookmark ───────────────────────────────────────────────────────

    @Test
    @DisplayName("북마크 삭제 시 searchLogRepository.deleteByUserIdAndArticleIdAndEventType 호출됨")
    void deleteBookmark_callsRepository() {
        // given
        String articleId = "article-001";

        // when
        userService.deleteBookmark(userId, articleId);

        // then
        verify(searchLogRepository).deleteByUserIdAndArticleIdAndEventType(userId, articleId, "ARTICLE_BOOKMARKED");
    }

    // ─── 북마크 삭제 ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("북마크 삭제: 트랜잭션이 없으면 삭제된 이벤트 수를 프로파일 되돌리기에 즉시 전달")
    void deleteBookmark_noTransaction_passesRemovedCountImmediately() {
        when(searchLogRepository.deleteByUserIdAndArticleIdAndEventType(userId, "art-1", "ARTICLE_BOOKMARKED"))
                .thenReturn(2L);

        userService.deleteBookmark(userId, "art-1");

        verify(userEventService).onBookmarkRemoved(userId, "art-1", 2L);
    }

    @Test
    @DisplayName("북마크 삭제: 삭제된 행이 없으면 프로파일 되돌리기를 호출하지 않음")
    void deleteBookmark_nothingDeleted_doesNotTouchProfile() {
        when(searchLogRepository.deleteByUserIdAndArticleIdAndEventType(userId, "art-1", "ARTICLE_BOOKMARKED"))
                .thenReturn(0L);

        userService.deleteBookmark(userId, "art-1");

        verify(userEventService, never()).onBookmarkRemoved(any(), anyString(), anyLong());
    }

    @Test
    @DisplayName("북마크 삭제: 트랜잭션 안에서는 커밋 이후에만 프로파일을 되돌림 (롤백되면 호출하지 않음)")
    void deleteBookmark_inTransaction_runsOnlyAfterCommit() {
        when(searchLogRepository.deleteByUserIdAndArticleIdAndEventType(userId, "art-1", "ARTICLE_BOOKMARKED"))
                .thenReturn(1L);

        TransactionSynchronizationManager.initSynchronization();
        try {
            userService.deleteBookmark(userId, "art-1");

            verify(userEventService, never()).onBookmarkRemoved(any(), anyString(), anyLong());   // 커밋 전에는 호출 안 됨

            TransactionSynchronizationManager.getSynchronizations()
                    .forEach(TransactionSynchronization::afterCommit);
            verify(userEventService).onBookmarkRemoved(userId, "art-1", 1L);
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }
}
