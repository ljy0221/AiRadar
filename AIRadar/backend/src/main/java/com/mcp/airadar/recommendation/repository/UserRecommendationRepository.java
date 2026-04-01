package com.mcp.airadar.recommendation.repository;

import com.mcp.airadar.recommendation.entity.UserRecommendation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface UserRecommendationRepository extends JpaRepository<UserRecommendation, UUID> {

    @Query("""
            SELECT r FROM UserRecommendation r
            WHERE r.userId = :userId
              AND r.expiresAt > :now
            ORDER BY r.score DESC
            """)
    List<UserRecommendation> findValidByUserId(
            @Param("userId") UUID userId,
            @Param("now") LocalDateTime now);

    @Query("""
            SELECT r FROM UserRecommendation r
            WHERE r.userId = :userId
              AND r.contentType = :contentType
              AND r.expiresAt > :now
            ORDER BY r.score DESC
            """)
    List<UserRecommendation> findValidByUserIdAndContentType(
            @Param("userId") UUID userId,
            @Param("contentType") String contentType,
            @Param("now") LocalDateTime now);
}
