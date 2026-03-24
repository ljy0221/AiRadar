package com.mcp.airadar.news.repository;

import com.mcp.airadar.news.entity.NewsItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface NewsRepository extends JpaRepository<NewsItem, String> {

    @Query(value = """
        SELECT *
        FROM news_items
        WHERE is_active = TRUE
          AND published_at >= :startInclusive
          AND published_at < :endExclusive
          AND (:region IS NULL OR region = :region)
          AND (:category IS NULL OR category = :category)
        ORDER BY
          CASE WHEN score IS NULL THEN 1 ELSE 0 END,
          score DESC,
          published_at DESC
        """, nativeQuery = true)
    List<NewsItem> findRecentNewsFeed(
            @Param("region") String region,
            @Param("category") String category,
            @Param("startInclusive") LocalDateTime startInclusive,
            @Param("endExclusive") LocalDateTime endExclusive);

    @Query(value = """
        SELECT DISTINCT DATE(published_at)
        FROM news_items
        WHERE is_active = TRUE
          AND published_at IS NOT NULL
          AND (:region IS NULL OR region = :region)
          AND (:category IS NULL OR category = :category)
        ORDER BY DATE(published_at) DESC
        """, nativeQuery = true)
    List<LocalDate> findAvailableDates(
            @Param("region") String region,
            @Param("category") String category);

    @Query(value = """
        SELECT n.*
        FROM company_news_timeline cnt
        JOIN news_items n ON n.article_id = cnt.article_id
        WHERE LOWER(cnt.company_name) = :companyName
          AND n.is_active = TRUE
        ORDER BY
          cnt.published_at DESC NULLS LAST,
          CASE WHEN n.score IS NULL THEN 1 ELSE 0 END,
          n.score DESC,
          n.published_at DESC
        LIMIT :limit
        """, nativeQuery = true)
    List<NewsItem> findCompanyNews(
            @Param("companyName") String companyName,
            @Param("limit") int limit);

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
