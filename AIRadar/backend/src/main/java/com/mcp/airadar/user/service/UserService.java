package com.mcp.airadar.user.service;

import com.mcp.airadar.auth.entity.AuthProvider;
import com.mcp.airadar.auth.entity.User;
import com.mcp.airadar.auth.repository.UserRepository;
import com.mcp.airadar.recommendation.repository.SearchLogRepository;
import com.mcp.airadar.user.dto.AddInterestRequest;
import com.mcp.airadar.user.dto.BookmarkHistoryDto;
import com.mcp.airadar.user.dto.LikeHistoryDto;
import com.mcp.airadar.user.dto.OnboardingRequest;
import com.mcp.airadar.user.dto.UpdateProfileRequest;
import com.mcp.airadar.user.dto.UserInterestDto;
import com.mcp.airadar.user.dto.UserProfileDto;
import com.mcp.airadar.user.dto.ViewHistoryDto;
import com.mcp.airadar.user.entity.UserInterest;
import com.mcp.airadar.user.repository.UserInterestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private static final String PROFILE_KEY = "user:%s:profile";

    private final UserRepository userRepository;
    private final UserInterestRepository userInterestRepository;
    private final SearchLogRepository searchLogRepository;
    private final PasswordEncoder passwordEncoder;
    private final StringRedisTemplate redisTemplate;

    public UserProfileDto getProfile(UUID userId) {
        User user = findUser(userId);
        return new UserProfileDto(user.getId(), user.getEmail(), user.getName(), user.getCreatedAt());
    }

    public List<UserInterestDto> getInterests(UUID userId) {
        return userInterestRepository.findByUserIdOrderByWeightDesc(userId).stream()
                .map(i -> new UserInterestDto(i.getKeyword(), i.getWeight(), i.getSource(), i.getCreatedAt()))
                .toList();
    }

    @Transactional
    public UserInterestDto addInterest(UUID userId, AddInterestRequest request) {
        if (userInterestRepository.existsByUserIdAndKeyword(userId, request.keyword())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 등록된 관심 키워드입니다: " + request.keyword());
        }
        try {
            UserInterest saved = userInterestRepository.save(
                    UserInterest.builder()
                            .userId(userId)
                            .keyword(request.keyword())
                            .build()
            );
            return new UserInterestDto(saved.getKeyword(), saved.getWeight(), saved.getSource(), saved.getCreatedAt());
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 등록된 관심 키워드입니다: " + request.keyword());
        }
    }

    /**
     * 온보딩 완료 처리
     * - 선택한 키워드를 user_interests에 일괄 저장
     * - Redis 유저 프로파일에 키워드 가중치 즉시 반영
     * - users.onboarding_completed = true 업데이트
     */
    @Transactional
    public void completeOnboarding(UUID userId, OnboardingRequest request) {
        User user = findUser(userId);
        if (user.isOnboardingCompleted()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 온보딩이 완료된 계정입니다.");
        }

        String profileKey = PROFILE_KEY.formatted(userId);
        for (String keyword : request.keywords()) {
            if (!userInterestRepository.existsByUserIdAndKeyword(userId, keyword)) {
                userInterestRepository.save(UserInterest.builder()
                        .userId(userId)
                        .keyword(keyword)
                        .build());
            }
            // Redis 프로파일에 키워드 가중치 즉시 반영 (기존 값보다 작을 때만 초기화)
            redisTemplate.opsForHash().putIfAbsent(profileKey, "kw:" + keyword, "1.0");
        }

        user.completeOnboarding();
    }

    @Transactional
    public void deleteInterest(UUID userId, String keyword) {
        userInterestRepository.deleteByUserIdAndKeyword(userId, keyword);
    }

    public List<ViewHistoryDto> getViewHistory(UUID userId) {
        return searchLogRepository.findRecentViewHistory(userId).stream()
                .map(log -> new ViewHistoryDto(log.getArticleId(), log.getOccurredAt()))
                .toList();
    }

    public List<BookmarkHistoryDto> getBookmarkHistory(UUID userId) {
        return searchLogRepository.findBookmarkHistory(userId).stream()
                .map(log -> new BookmarkHistoryDto(log.getArticleId(), log.getOccurredAt()))
                .toList();
    }

    public List<LikeHistoryDto> getLikeHistory(UUID userId) {
        return searchLogRepository.findLikeHistory(userId).stream()
                .map(log -> new LikeHistoryDto(log.getArticleId(), log.getOccurredAt()))
                .toList();
    }

    @Transactional
    public UserProfileDto updateProfile(UUID userId, UpdateProfileRequest request) {
        User user = findUser(userId);

        if (request.name() != null) {
            user.updateName(request.name());
        }

        if (request.newPassword() != null) {
            if (user.getProvider() != AuthProvider.LOCAL) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "소셜 로그인 계정은 비밀번호를 변경할 수 없습니다.");
            }
            if (request.currentPassword() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "현재 비밀번호를 입력해주세요.");
            }
            if (!passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "현재 비밀번호가 올바르지 않습니다.");
            }
            user.updatePassword(passwordEncoder.encode(request.newPassword()));
        }

        return new UserProfileDto(user.getId(), user.getEmail(), user.getName(), user.getCreatedAt());
    }

    private User findUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));
    }
}
