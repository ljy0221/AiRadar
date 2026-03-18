package com.mcp.airadar.recommendation.controller;

import com.mcp.airadar.recommendation.dto.ArticleActionRequest;
import com.mcp.airadar.recommendation.dto.ArticleViewRequest;
import com.mcp.airadar.recommendation.dto.SearchEventRequest;
import com.mcp.airadar.recommendation.service.UserEventService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

/**
 * 사용자 행동 이벤트 수집 API
 *
 * Next.js → Spring Boot → @Async 처리 (응답 202 즉시 반환)
 * 모든 엔드포인트는 fire-and-forget이므로 응답 본문 없음.
 */
@RestController
@RequestMapping("/api/v1/events")
@RequiredArgsConstructor
public class EventController {

    private final UserEventService userEventService;

    /**
     * 기사 조회 이벤트
     * dwellTimeSeconds >= 30 일 때만 프로파일에 반영됨
     * [AUTH 필요]
     */
    @PostMapping("/article-view")
    public ResponseEntity<Void> articleView(
            @AuthenticationPrincipal UUID userId,
            @Valid @RequestBody ArticleViewRequest request) {
        userEventService.onArticleViewed(userId, request.articleId(), request.dwellTimeSeconds());
        return ResponseEntity.accepted().build();
    }

    /**
     * 검색 이벤트 — 비로그인도 트렌딩 반영 (userId null 허용)
     * [AUTH 선택]
     */
    @PostMapping("/search")
    public ResponseEntity<Void> search(
            @AuthenticationPrincipal UUID userId,
            @Valid @RequestBody SearchEventRequest request) {
        userEventService.onArticleSearched(userId, request.query());
        return ResponseEntity.accepted().build();
    }

    /**
     * 좋아요 이벤트
     * [AUTH 필요]
     */
    @PostMapping("/article-like")
    public ResponseEntity<Void> articleLike(
            @AuthenticationPrincipal UUID userId,
            @Valid @RequestBody ArticleActionRequest request) {
        userEventService.onArticleLiked(userId, request.articleId());
        return ResponseEntity.accepted().build();
    }

    /**
     * 북마크 이벤트
     * [AUTH 필요]
     */
    @PostMapping("/article-bookmark")
    public ResponseEntity<Void> articleBookmark(
            @AuthenticationPrincipal UUID userId,
            @Valid @RequestBody ArticleActionRequest request) {
        userEventService.onArticleBookmarked(userId, request.articleId());
        return ResponseEntity.accepted().build();
    }
}
