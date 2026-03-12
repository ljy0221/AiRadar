package com.mcp.airadar.news.controller;

import com.mcp.airadar.news.dto.NewsDto;
import com.mcp.airadar.news.service.NewsService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/news")
public class NewsController {

    private final NewsService newsService;

    public NewsController(NewsService newsService) {
        this.newsService = newsService;
    }

    @GetMapping
    public ResponseEntity<Page<NewsDto.ListItem>> getNewsList(
            @RequestParam(required = false) String region,
            @RequestParam(required = false) String category,
            @PageableDefault(size = 20, sort = "publishedAt") Pageable pageable
    ) {
        return ResponseEntity.ok(newsService.getNewsList(region, category, pageable));
    }

    @GetMapping("/{articleId}")
    public ResponseEntity<NewsDto.Detail> getNewsDetail(@PathVariable String articleId) {
        return ResponseEntity.ok(newsService.getNewsDetail(articleId));
    }
}
