package com.mcp.airadar.news.service;

import com.mcp.airadar.news.dto.NewsDto;
import com.mcp.airadar.news.entity.NewsItem;
import com.mcp.airadar.news.repository.NewsRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class NewsService {

    private final NewsRepository newsRepository;

    public NewsService(NewsRepository newsRepository) {
        this.newsRepository = newsRepository;
    }

    public Page<NewsDto.ListItem> getNewsList(String region, String category, Pageable pageable) {
        Page<NewsItem> page;
        if (region != null && category != null) {
            page = newsRepository.findByIsActiveTrueAndRegionAndCategoryOrderByPublishedAtDesc(region, category, pageable);
        } else if (region != null) {
            page = newsRepository.findByIsActiveTrueAndRegionOrderByPublishedAtDesc(region, pageable);
        } else if (category != null) {
            page = newsRepository.findByIsActiveTrueAndCategoryOrderByPublishedAtDesc(category, pageable);
        } else {
            page = newsRepository.findByIsActiveTrueOrderByPublishedAtDesc(pageable);
        }
        return page.map(NewsDto.ListItem::from);
    }

    public NewsDto.Detail getNewsDetail(String articleId) {
        NewsItem item = newsRepository.findByArticleIdAndIsActiveTrue(articleId)
                .orElseThrow(() -> new EntityNotFoundException("뉴스를 찾을 수 없습니다: " + articleId));
        return NewsDto.Detail.from(item);
    }
}
