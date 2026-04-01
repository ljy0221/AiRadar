package com.mcp.airadar.mock.service;

import com.mcp.airadar.github.entity.GithubRepo;
import com.mcp.airadar.github.repository.GithubRepoRepository;
import com.mcp.airadar.mock.dto.MockMixedItemDto;
import com.mcp.airadar.news.entity.NewsItem;
import com.mcp.airadar.news.repository.NewsRepository;
import com.mcp.airadar.paper.entity.Paper;
import com.mcp.airadar.paper.repository.PaperRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MockFeedService {

    private final NewsRepository newsRepository;
    private final PaperRepository paperRepository;
    private final GithubRepoRepository githubRepoRepository;

    public MockFeedService(
            NewsRepository newsRepository,
            PaperRepository paperRepository,
            GithubRepoRepository githubRepoRepository
    ) {
        this.newsRepository = newsRepository;
        this.paperRepository = paperRepository;
        this.githubRepoRepository = githubRepoRepository;
    }

    public List<MockMixedItemDto> getNewsItems(int size) {
        if (size <= 0) return List.of();
        return newsRepository.findRandomActiveItems(size)
                .stream()
                .map(this::toNewsDto)
                .toList();
    }

    public List<MockMixedItemDto> getPaperItems(int size) {
        if (size <= 0) return List.of();
        return paperRepository.findRandomActiveItems(size)
                .stream()
                .map(this::toPaperDto)
                .toList();
    }

    public List<MockMixedItemDto> getGithubItems(int size) {
        if (size <= 0) return List.of();
        return githubRepoRepository.findRandomItems(size)
                .stream()
                .map(this::toGithubDto)
                .toList();
    }

    private MockMixedItemDto toNewsDto(NewsItem item) {
        return new MockMixedItemDto(
                "news",
                item.getArticleId(),
                item.getTitle(),
                nullSafe(item.getSummary()),
                item.getCategory(),
                nullSafe(item.getSource()),
                nullSafe(item.getUrl()),
                item.getPublishedAt() == null ? null : item.getPublishedAt().toString()
        );
    }

    private MockMixedItemDto toPaperDto(Paper item) {
        return new MockMixedItemDto(
                "paper",
                item.getPaperId(),
                item.getTitle(),
                nullSafe(item.getSummary()),
                item.getCategory(),
                nullSafe(item.getSource()),
                nullSafe(item.getUrl()),
                item.getPublishedAt() == null ? null : item.getPublishedAt().toString()
        );
    }

    private MockMixedItemDto toGithubDto(GithubRepo item) {
        return new MockMixedItemDto(
                "github",
                item.getRepoId(),
                item.getRepoName(),
                nullSafe(item.getDescription()),
                null,
                "GitHub",
                "https://github.com/" + item.getRepoId(),
                item.getSnapshotDate() == null ? null : item.getSnapshotDate().toString()
        );
    }

    private String nullSafe(String value) {
        return value == null ? "" : value;
    }
}
