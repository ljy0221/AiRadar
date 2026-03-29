package com.mcp.airadar.paper.repository;

import com.mcp.airadar.paper.entity.Paper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface PaperRepository extends JpaRepository<Paper, String> {

    @Query("""
        SELECT p
        FROM Paper p
        WHERE p.isActive = true
          AND p.publishedAt >= :startInclusive
          AND p.publishedAt < :endExclusive
          AND (:category IS NULL OR p.category = :category)
          AND (:researchArea IS NULL OR p.researchArea = :researchArea)
        ORDER BY p.publishedAt DESC
        """)
    List<Paper> findRecentPaperFeed(
            @Param("category") String category,
            @Param("researchArea") String researchArea,
            @Param("startInclusive") LocalDateTime startInclusive,
            @Param("endExclusive") LocalDateTime endExclusive);

    @Query(value = """
        SELECT *
        FROM papers
        WHERE is_active = TRUE
          AND published_at IS NOT NULL
          AND published_at >= :startInclusive
          AND published_at < :endExclusive
          AND (:category IS NULL OR category = :category)
          AND (:researchArea IS NULL OR research_area = :researchArea)
        ORDER BY published_at DESC, paper_id DESC
        LIMIT :limit
        """, nativeQuery = true)
    List<Paper> findRecentPaperFeedFirstPage(
            @Param("category") String category,
            @Param("researchArea") String researchArea,
            @Param("startInclusive") LocalDateTime startInclusive,
            @Param("endExclusive") LocalDateTime endExclusive,
            @Param("limit") int limit);

    @Query(value = """
        SELECT *
        FROM papers
        WHERE is_active = TRUE
          AND published_at IS NOT NULL
          AND published_at >= :startInclusive
          AND published_at < :endExclusive
          AND (:category IS NULL OR category = :category)
          AND (:researchArea IS NULL OR research_area = :researchArea)
          AND (
                published_at < :cursorPublishedAt
                OR (published_at = :cursorPublishedAt AND paper_id < :cursorId)
          )
        ORDER BY published_at DESC, paper_id DESC
        LIMIT :limit
        """, nativeQuery = true)
    List<Paper> findRecentPaperFeedPage(
            @Param("category") String category,
            @Param("researchArea") String researchArea,
            @Param("startInclusive") LocalDateTime startInclusive,
            @Param("endExclusive") LocalDateTime endExclusive,
            @Param("cursorPublishedAt") LocalDateTime cursorPublishedAt,
            @Param("cursorId") String cursorId,
            @Param("limit") int limit);

    @Query(value = """
        SELECT DISTINCT CAST(DATE(published_at) AS TEXT) AS published_date
        FROM papers
        WHERE is_active = TRUE
          AND published_at IS NOT NULL
          AND (:category IS NULL OR category = :category)
          AND (:researchArea IS NULL OR research_area = :researchArea)
        ORDER BY published_date DESC
        """, nativeQuery = true)
    List<String> findAvailableDateStrings(
            @Param("category") String category,
            @Param("researchArea") String researchArea);

    Page<Paper> findByIsActiveTrueOrderByPublishedAtDesc(Pageable pageable);

    Page<Paper> findByIsActiveTrueAndCategoryOrderByPublishedAtDesc(String category, Pageable pageable);

    Page<Paper> findByIsActiveTrueAndResearchAreaOrderByPublishedAtDesc(String researchArea, Pageable pageable);

    Page<Paper> findByIsActiveTrueAndCategoryAndResearchAreaOrderByPublishedAtDesc(
            String category, String researchArea, Pageable pageable);

    Optional<Paper> findByPaperIdAndIsActiveTrue(String paperId);

    /** 키워드 배열 교집합 매칭 — 추천 서빙용 */
    @Query(value = """
        SELECT * FROM papers
        WHERE is_active = true
          AND keywords && CAST(:keywords AS TEXT[])
          AND published_at >= :since
        ORDER BY published_at DESC
        LIMIT :limit
        """, nativeQuery = true)
    List<Paper> findByKeywordsOverlap(
            @Param("keywords") String keywords,
            @Param("since") java.time.LocalDateTime since,
            @Param("limit") int limit);

    /** score 대신 published_at 최신순 인기 논문 (Cold start fallback) */
    List<Paper> findTop20ByIsActiveTrueOrderByPublishedAtDesc();

    @Query(value = """
            SELECT *
            FROM papers
            WHERE is_active = TRUE
            ORDER BY RANDOM()
            LIMIT :limit
            """, nativeQuery = true)
    List<Paper> findRandomActiveItems(@Param("limit") int limit);
}
