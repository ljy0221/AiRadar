package com.mcp.airadar.dashboard.repository;

import com.mcp.airadar.dashboard.entity.JobAiRisk;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface JobAiRiskRepository extends JpaRepository<JobAiRisk, String> {

    List<JobAiRisk> findAllByOrderByRiskScoreDesc();

    List<JobAiRisk> findByRiskLevelOrderByRiskScoreDesc(String riskLevel);
}
