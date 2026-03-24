package com.mcp.airadar.dashboard.controller;

import com.mcp.airadar.dashboard.dto.JobRiskDto;
import com.mcp.airadar.dashboard.dto.KeywordTrendDto;
import com.mcp.airadar.dashboard.dto.LifecycleDto;
import com.mcp.airadar.dashboard.dto.WordCloudDto;
import com.mcp.airadar.dashboard.service.DashboardService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/dashboard")
public class DashboardController {

    private final DashboardService dashboardService;

    public DashboardController(DashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/keywords")
    public ResponseEntity<List<KeywordTrendDto>> getKeywordTrends(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(dashboardService.getKeywordTrends(date));
    }

    @GetMapping("/lifecycle")
    public ResponseEntity<List<LifecycleDto>> getLifecycle(
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(dashboardService.getLifecycle(status));
    }

    @GetMapping("/jobs")
    public ResponseEntity<List<JobRiskDto>> getJobRisks() {
        return ResponseEntity.ok(dashboardService.getJobRisks());
    }

    @GetMapping("/wordcloud")
    public ResponseEntity<List<WordCloudDto>> getWordCloud(
            @RequestParam(defaultValue = "NEWS") String source,
            @RequestParam(defaultValue = "50") int limit) {
        return ResponseEntity.ok(dashboardService.getWordCloud(source, limit));
    }
}
