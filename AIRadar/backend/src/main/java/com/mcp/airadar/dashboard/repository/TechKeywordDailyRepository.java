package com.mcp.airadar.dashboard.repository;

import com.mcp.airadar.dashboard.entity.TechKeywordDaily;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface TechKeywordDailyRepository extends JpaRepository<TechKeywordDaily, Long> {

    List<TechKeywordDaily> findByStatDateOrderByMentionCountDesc(LocalDate statDate);

    @Query(value = """
            INSERT INTO tech_keyword_daily (keyword, stat_date, source_type, search_count, created_at)
            VALUES (:keyword, :statDate, 'NEWS', 1, NOW())
            ON CONFLICT (keyword, stat_date, source_type)
            DO UPDATE SET search_count = tech_keyword_daily.search_count + 1
            """, nativeQuery = true)
    @Modifying
    void upsertSearchCount(@Param("keyword") String keyword, @Param("statDate") LocalDate statDate);

    @Query(value = """
            SELECT keyword, mention_count
            FROM tech_keyword_daily
            WHERE stat_date = (
                SELECT MAX(stat_date) FROM tech_keyword_daily WHERE source_type = :sourceType
            )
            AND source_type = :sourceType
            ORDER BY mention_count DESC
            LIMIT :limit
            """, nativeQuery = true)
    List<Object[]> findTopKeywordsByLatestWeekAndSourceType(@Param("sourceType") String sourceType, @Param("limit") int limit);
}
