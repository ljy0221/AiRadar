package com.mcp.airadar.mock.controller;

import com.mcp.airadar.mock.dto.MockMixedItemDto;
import com.mcp.airadar.mock.service.MockFeedService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/mock")
public class MockFeedController {

    private final MockFeedService mockFeedService;

    public MockFeedController(MockFeedService mockFeedService) {
        this.mockFeedService = mockFeedService;
    }

    @GetMapping("/news")
    public ResponseEntity<List<MockMixedItemDto>> getNews(
            @RequestParam(defaultValue = "10") int limit
    ) {
        return ResponseEntity.ok(mockFeedService.getNewsItems(limit));
    }

    @GetMapping("/papers")
    public ResponseEntity<List<MockMixedItemDto>> getPapers(
            @RequestParam(defaultValue = "10") int limit
    ) {
        return ResponseEntity.ok(mockFeedService.getPaperItems(limit));
    }

    @GetMapping("/github")
    public ResponseEntity<List<MockMixedItemDto>> getGithub(
            @RequestParam(defaultValue = "10") int limit
    ) {
        return ResponseEntity.ok(mockFeedService.getGithubItems(limit));
    }
}
