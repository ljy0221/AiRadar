package com.mcp.airadar.news.repository;

import com.mcp.airadar.news.entity.NewsItem;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface NewsRepository extends JpaRepository<NewsItem, String> {

    Page<NewsItem> findByIsActiveTrueOrderByPublishedAtDesc(Pageable pageable);

    Page<NewsItem> findByIsActiveTrueAndRegionOrderByPublishedAtDesc(String region, Pageable pageable);

    Page<NewsItem> findByIsActiveTrueAndCategoryOrderByPublishedAtDesc(String category, Pageable pageable);

    Page<NewsItem> findByIsActiveTrueAndRegionAndCategoryOrderByPublishedAtDesc(
            String region, String category, Pageable pageable);

    Optional<NewsItem> findByArticleIdAndIsActiveTrue(String articleId);

    /**
     * 키워드 배열 중 하나라도 매칭되는 최근 기사 조회 (추천 서빙용)
     * PostgreSQL && 연산자: 두 배열의 교집합이 존재하면 true
     */
    @Query(value = """
        SELECT * FROM news_items
        WHERE is_active = true
          AND keywords && CAST(:keywords AS TEXT[])
          AND published_at >= :since
        ORDER BY score DESC, published_at DESC
        LIMIT :limit
        """, nativeQuery = true)
    List<NewsItem> findByKeywordsOverlap(
            @Param("keywords") String keywords,
            @Param("since") LocalDateTime since,
            @Param("limit") int limit);

    /** score 내림차순 인기 기사 (Cold start fallback) */
    List<NewsItem> findTop20ByIsActiveTrueOrderByScoreDescPublishedAtDesc();

    @Query(value = """
            SELECT *
            FROM news_items
            WHERE is_active = TRUE
            ORDER BY RANDOM()
            LIMIT :limit
            """, nativeQuery = true)
    List<NewsItem> findRandomActiveItems(@Param("limit") int limit);
}
