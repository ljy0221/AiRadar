package com.mcp.airadar.news.controller;

import com.mcp.airadar.news.dto.NewsDto;
import com.mcp.airadar.news.service.NewsService;
import org.springframework.http.ResponseEntity;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/news")
public class NewsController {

    private final NewsService newsService;

    public NewsController(NewsService newsService) {
        this.newsService = newsService;
    }

    @GetMapping
    public ResponseEntity<List<NewsDto.DailyGroup>> getNewsList(
            @RequestParam(required = false) String region,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        return ResponseEntity.ok(newsService.getNewsList(region, category, date, startDate, endDate));
    }

    @GetMapping("/available-dates")
    public ResponseEntity<NewsDto.AvailableDates> getAvailableDates(
            @RequestParam(required = false) String region,
            @RequestParam(required = false) String category
    ) {
        return ResponseEntity.ok(newsService.getAvailableDates(region, category));
    }

    @GetMapping("/companies")
    public ResponseEntity<List<NewsDto.CompanyNewsGroup>> getCompanyNews(
            @RequestParam(required = false) String company,
            @RequestParam(required = false) Integer limit
    ) {
        return ResponseEntity.ok(newsService.getCompanyNews(company, limit));
    }

    @GetMapping("/{articleId}")
    public ResponseEntity<NewsDto.Detail> getNewsDetail(@PathVariable String articleId) {
        return ResponseEntity.ok(newsService.getNewsDetail(articleId));
    }
}
