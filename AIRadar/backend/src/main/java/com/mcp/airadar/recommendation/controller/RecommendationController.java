package com.mcp.airadar.recommendation.controller;

import com.mcp.airadar.recommendation.dto.RecommendationDto;
import com.mcp.airadar.recommendation.service.RecommendationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/**
 * 개인화 추천 서빙 API
 *
 * 서빙 흐름:
 *   Redis 캐시(30분) → 유저 프로파일 키워드 매칭 → Cold start fallback
 */
@RestController
@RequestMapping("/api/v1/recommendations")
@RequiredArgsConstructor
public class RecommendationController {

    private final RecommendationService recommendationService;

    /**
     * 개인화 뉴스 피드
     * GET /api/v1/recommendations/news
     *
     * [AUTH 필요] — 비로그인 시 401
     *
     * @param size 반환할 기사 수 (기본 20, 최대 50)
     */
    @GetMapping("/news")
    public ResponseEntity<List<RecommendationDto.NewsItem>> getPersonalizedFeed(
            @AuthenticationPrincipal UUID userId,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(recommendationService.getPersonalizedFeed(userId, size));
    }
}
