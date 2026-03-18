package com.mcp.airadar.user.service;

import com.mcp.airadar.auth.entity.User;
import com.mcp.airadar.auth.repository.UserRepository;
import com.mcp.airadar.recommendation.repository.SearchLogRepository;
import com.mcp.airadar.user.dto.AddInterestRequest;
import com.mcp.airadar.user.dto.UserInterestDto;
import com.mcp.airadar.user.dto.UserProfileDto;
import com.mcp.airadar.user.dto.ViewHistoryDto;
import com.mcp.airadar.user.entity.UserInterest;
import com.mcp.airadar.user.repository.UserInterestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final UserInterestRepository userInterestRepository;
    private final SearchLogRepository searchLogRepository;

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

    @Transactional
    public void deleteInterest(UUID userId, String keyword) {
        userInterestRepository.deleteByUserIdAndKeyword(userId, keyword);
    }

    public List<ViewHistoryDto> getViewHistory(UUID userId) {
        return searchLogRepository.findRecentViewHistory(userId).stream()
                .map(log -> new ViewHistoryDto(log.getArticleId(), log.getOccurredAt()))
                .toList();
    }

    private User findUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."));
    }
}
