package com.mcp.airadar.recommendation.controller;

import com.mcp.airadar.recommendation.service.UserEventService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 트렌딩 키워드 서빙 API — 비로그인 포함 공개
 */
@RestController
@RequestMapping("/api/v1/recommendations/trending")
@RequiredArgsConstructor
public class TrendingController {

    private final UserEventService userEventService;

    /**
     * 전체 트렌딩 키워드 Top N (기본 20개)
     * GET /api/v1/recommendations/trending
     */
    @GetMapping
    public ResponseEntity<List<String>> trending(
            @RequestParam(defaultValue = "20") int limit) {
        return ResponseEntity.ok(userEventService.getTopTrending(Math.min(limit, 50)));
    }

    /**
     * 최근 1시간 핫이슈 Top N (기본 10개)
     * GET /api/v1/recommendations/trending/hourly
     */
    @GetMapping("/hourly")
    public ResponseEntity<List<String>> hourlyTrending(
            @RequestParam(defaultValue = "10") int limit) {
        return ResponseEntity.ok(userEventService.getHourlyTrending(Math.min(limit, 20)));
    }
}
