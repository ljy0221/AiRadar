package com.mcp.airadar.recommendation.repository;

import com.mcp.airadar.recommendation.entity.SearchLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SearchLogRepository extends JpaRepository<SearchLog, Long> {
}
