package com.mcp.airadar.paper.repository;

import com.mcp.airadar.paper.entity.Paper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PaperRepository extends JpaRepository<Paper, String> {

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
