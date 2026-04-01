package com.mcp.airadar.dashboard.repository;

import com.mcp.airadar.dashboard.entity.TechLifecycle;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TechLifecycleRepository extends JpaRepository<TechLifecycle, String> {

    List<TechLifecycle> findByStatusOrderByTrendScoreDesc(String status);

    List<TechLifecycle> findAllByOrderByTrendScoreDesc();
}
