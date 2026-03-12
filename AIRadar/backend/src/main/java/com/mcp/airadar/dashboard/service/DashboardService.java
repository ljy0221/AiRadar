package com.mcp.airadar.dashboard.service;

import com.mcp.airadar.dashboard.dto.JobRiskDto;
import com.mcp.airadar.dashboard.dto.KeywordTrendDto;
import com.mcp.airadar.dashboard.dto.LifecycleDto;
import com.mcp.airadar.dashboard.repository.JobAiRiskRepository;
import com.mcp.airadar.dashboard.repository.TechKeywordDailyRepository;
import com.mcp.airadar.dashboard.repository.TechLifecycleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class DashboardService {

    private final TechKeywordDailyRepository keywordDailyRepository;
    private final TechLifecycleRepository lifecycleRepository;
    private final JobAiRiskRepository jobAiRiskRepository;

    public DashboardService(TechKeywordDailyRepository keywordDailyRepository,
                            TechLifecycleRepository lifecycleRepository,
                            JobAiRiskRepository jobAiRiskRepository) {
        this.keywordDailyRepository = keywordDailyRepository;
        this.lifecycleRepository = lifecycleRepository;
        this.jobAiRiskRepository = jobAiRiskRepository;
    }

    public List<KeywordTrendDto> getKeywordTrends(LocalDate date) {
        LocalDate targetDate = (date != null) ? date : LocalDate.now();
        return keywordDailyRepository.findByStatDateOrderByMentionCountDesc(targetDate)
                .stream()
                .limit(10)
                .map(KeywordTrendDto::from)
                .toList();
    }

    public List<LifecycleDto> getLifecycle(String status) {
        if (status != null) {
            return lifecycleRepository.findByStatusOrderByTrendScoreDesc(status)
                    .stream().map(LifecycleDto::from).toList();
        }
        return lifecycleRepository.findAllByOrderByTrendScoreDesc()
                .stream().map(LifecycleDto::from).toList();
    }

    public List<JobRiskDto> getJobRisks() {
        return jobAiRiskRepository.findAllByOrderByRiskScoreDesc()
                .stream().map(JobRiskDto::from).toList();
    }
}
