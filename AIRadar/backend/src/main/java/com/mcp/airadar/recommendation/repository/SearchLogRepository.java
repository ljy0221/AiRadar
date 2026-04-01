package com.mcp.airadar.recommendation.repository;

import com.mcp.airadar.recommendation.entity.SearchLog;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface SearchLogRepository extends JpaRepository<SearchLog, Long> {

    @Query(value = """
            SELECT * FROM search_logs
            WHERE user_id = :userId
              AND event_type = 'ARTICLE_VIEWED'
              AND occurred_at >= NOW() - INTERVAL '30 days'
            ORDER BY occurred_at DESC
            LIMIT 50
            """, nativeQuery = true)
    List<SearchLog> findRecentViewHistory(@Param("userId") UUID userId);

    @Query(value = """
            SELECT DISTINCT ON (article_id) *
            FROM search_logs
            WHERE user_id = :userId
              AND event_type = 'ARTICLE_BOOKMARKED'
            ORDER BY article_id, occurred_at DESC
            """, nativeQuery = true)
    List<SearchLog> findBookmarkHistory(@Param("userId") UUID userId);

    void deleteByUserIdAndArticleIdAndEventType(UUID userId, String articleId, String eventType);
}
