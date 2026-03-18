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

    @Query(value = """
            SELECT *
            FROM papers
            WHERE is_active = TRUE
            ORDER BY RANDOM()
            LIMIT :limit
            """, nativeQuery = true)
    List<Paper> findRandomActiveItems(@Param("limit") int limit);
}
