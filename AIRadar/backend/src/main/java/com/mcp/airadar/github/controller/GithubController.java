package com.mcp.airadar.github.controller;

import com.mcp.airadar.github.dto.GithubTrendingDto;
import com.mcp.airadar.github.service.GithubService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/github")
public class GithubController {

    private final GithubService githubService;

    public GithubController(GithubService githubService) {
        this.githubService = githubService;
    }

    /**
     * GET /api/v1/github/trending?date=2026-03-18&limit=10
     *
     * 특정 날짜 기준 전날 대비 star 급증 레포 목록을 반환한다.
     * date 미입력 시 오늘 날짜 기준, limit 기본값 10 / 최대 50.
     */
    @GetMapping("/trending")
    public ResponseEntity<List<GithubTrendingDto>> getTrending(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(defaultValue = "10") int limit
    ) {
        return ResponseEntity.ok(githubService.getTrendingRepos(date, limit));
    }
}
