package com.mcp.airadar.github.repository;

import com.mcp.airadar.github.entity.GithubRepoDaily;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface GithubRepoDailyRepository extends JpaRepository<GithubRepoDaily, Long> {

    List<GithubRepoDaily> findByRepoIdInAndSnapshotDateBetweenOrderByRepoIdAscSnapshotDateAsc(
            List<String> repoIds,
            LocalDate fromDate,
            LocalDate toDate
    );

    /**
     * 특정 날짜 기준 star_delta_1d 상위 N개 레포 조회.
     * github_repos와 JOIN해 repo_name, description, language를 함께 반환.
     */
    @Query(value = """
            SELECT d.repo_id, r.repo_name, r.description, r.language,
                   d.stars, d.star_delta_1d, d.snapshot_date
            FROM github_repo_daily d
            JOIN github_repos r ON r.repo_id = d.repo_id
            WHERE d.snapshot_date = :date
              AND COALESCE(r.ai_relevance, FALSE) = TRUE
              AND d.star_delta_1d IS NOT NULL
            ORDER BY d.star_delta_1d DESC
            LIMIT :lim
            """, nativeQuery = true)
    List<Object[]> findTrendingByDate(@Param("date") LocalDate date, @Param("lim") int lim);
}
