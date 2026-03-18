package com.mcp.airadar.github.repository;

import com.mcp.airadar.github.entity.GithubRepo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface GithubRepoRepository extends JpaRepository<GithubRepo, String> {
    Page<GithubRepo> findByOrderBySnapshotDateDescStarsDesc(Pageable pageable);

    @Query(value = """
            SELECT *
            FROM github_repos
            ORDER BY RANDOM()
            LIMIT :limit
            """, nativeQuery = true)
    List<GithubRepo> findRandomItems(@Param("limit") int limit);
}
