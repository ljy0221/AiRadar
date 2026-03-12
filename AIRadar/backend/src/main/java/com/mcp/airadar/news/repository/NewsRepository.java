package com.mcp.airadar.news.repository;

import com.mcp.airadar.news.entity.NewsItem;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface NewsRepository extends JpaRepository<NewsItem, String> {

    Page<NewsItem> findByIsActiveTrueOrderByPublishedAtDesc(Pageable pageable);

    Page<NewsItem> findByIsActiveTrueAndRegionOrderByPublishedAtDesc(String region, Pageable pageable);

    Page<NewsItem> findByIsActiveTrueAndCategoryOrderByPublishedAtDesc(String category, Pageable pageable);

    Page<NewsItem> findByIsActiveTrueAndRegionAndCategoryOrderByPublishedAtDesc(
            String region, String category, Pageable pageable);

    Optional<NewsItem> findByArticleIdAndIsActiveTrue(String articleId);
}
