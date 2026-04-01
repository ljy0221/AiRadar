package com.mcp.airadar.github.controller;

import com.mcp.airadar.github.dto.GithubOverviewDto;
import com.mcp.airadar.github.dto.GithubTrendingDto;
import com.mcp.airadar.github.service.GithubService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/github")
public class GithubController {

    private final GithubService githubService;

    public GithubController(GithubService githubService) {
        this.githubService = githubService;
    }

    @GetMapping
    public ResponseEntity<GithubOverviewDto> getGithubOverview(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(defaultValue = "3") int limit,
            @RequestParam(defaultValue = "7") int dailyWindow,
            @RequestParam(defaultValue = "7") int monthlyWindow
    ) {
        return ResponseEntity.ok(githubService.getGithubOverview(date, limit, dailyWindow, monthlyWindow));
    }

    @GetMapping("/trending")
    public ResponseEntity<List<GithubTrendingDto>> getTrending(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(defaultValue = "10") int limit
    ) {
        if (date != null) {
            return ResponseEntity.ok(githubService.getTrendingRepos(date, limit));
        }
        if (startDate != null || endDate != null) {
            return ResponseEntity.ok(githubService.getTrendingReposByRange(startDate, endDate, limit));
        }
        return ResponseEntity.ok(githubService.getTrendingRepos(null, limit));
    }
}
