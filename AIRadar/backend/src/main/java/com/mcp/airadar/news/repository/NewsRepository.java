package com.mcp.airadar.news.repository;

import com.mcp.airadar.news.entity.NewsItem;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface NewsRepository extends JpaRepository<NewsItem, String> {

    Page<NewsItem> findByIsActiveTrueOrderByPublishedAtDesc(Pageable pageable);

    Page<NewsItem> findByIsActiveTrueAndRegionOrderByPublishedAtDesc(String region, Pageable pageable);

    Page<NewsItem> findByIsActiveTrueAndCategoryOrderByPublishedAtDesc(String category, Pageable pageable);

    Page<NewsItem> findByIsActiveTrueAndRegionAndCategoryOrderByPublishedAtDesc(
            String region, String category, Pageable pageable);

    Optional<NewsItem> findByArticleIdAndIsActiveTrue(String articleId);

    @Query(value = """
            SELECT *
            FROM news_items
            WHERE is_active = TRUE
            ORDER BY RANDOM()
            LIMIT :limit
            """, nativeQuery = true)
    List<NewsItem> findRandomActiveItems(@Param("limit") int limit);
}
