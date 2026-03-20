package com.mcp.airadar.github.repository;

import com.mcp.airadar.github.entity.GithubRepo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface GithubRepoRepository extends JpaRepository<GithubRepo, String> {
    Page<GithubRepo> findByOrderBySnapshotDateDescStarsDesc(Pageable pageable);

    @Query(value = """
            SELECT MAX(snapshot_date)
            FROM github_repos
            WHERE snapshot_date <= :date
            """, nativeQuery = true)
    LocalDate findLatestSnapshotDateOnOrBefore(@Param("date") LocalDate date);

    @Query(value = """
            SELECT *
            FROM github_repos
            WHERE snapshot_date = :date
              AND COALESCE(ai_relevance, FALSE) = TRUE
            ORDER BY COALESCE(star_delta_7d, -2147483648) DESC, stars DESC, repo_id ASC
            LIMIT :limit
            """, nativeQuery = true)
    List<GithubRepo> findTopTrendingBySnapshotDate(@Param("date") LocalDate date, @Param("limit") int limit);

    @Query(value = """
            SELECT *
            FROM github_repos
            ORDER BY RANDOM()
            LIMIT :limit
            """, nativeQuery = true)
    List<GithubRepo> findRandomItems(@Param("limit") int limit);
}
