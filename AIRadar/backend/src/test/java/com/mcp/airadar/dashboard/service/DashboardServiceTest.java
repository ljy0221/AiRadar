package com.mcp.airadar.dashboard.service;

import com.mcp.airadar.dashboard.dto.JobRiskDto;
import com.mcp.airadar.dashboard.dto.KeywordTrendDto;
import com.mcp.airadar.dashboard.dto.LifecycleDto;
import com.mcp.airadar.dashboard.entity.JobAiRisk;
import com.mcp.airadar.dashboard.entity.TechKeywordDaily;
import com.mcp.airadar.dashboard.entity.TechLifecycle;
import com.mcp.airadar.dashboard.repository.JobAiRiskRepository;
import com.mcp.airadar.dashboard.repository.TechKeywordDailyRepository;
import com.mcp.airadar.dashboard.repository.TechLifecycleRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DashboardServiceTest {

    @Mock
    private TechKeywordDailyRepository keywordDailyRepository;
    @Mock
    private TechLifecycleRepository lifecycleRepository;
    @Mock
    private JobAiRiskRepository jobAiRiskRepository;

    @InjectMocks
    private DashboardService dashboardService;

    @Test
    @DisplayName("date 없으면 오늘 날짜로 키워드 조회")
    void getKeywordTrends_nullDate_usesToday() {
        when(keywordDailyRepository.findByStatDateOrderByMentionCountDesc(any(LocalDate.class)))
                .thenReturn(List.of());

        List<KeywordTrendDto> result = dashboardService.getKeywordTrends(null);

        assertThat(result).isNotNull();
        verify(keywordDailyRepository).findByStatDateOrderByMentionCountDesc(LocalDate.now());
    }

    @Test
    @DisplayName("키워드 10개 초과 시 top 10만 반환")
    void getKeywordTrends_limitsTo10() {
        List<TechKeywordDaily> items = new ArrayList<>();
        for (int i = 0; i < 15; i++) items.add(new TechKeywordDaily());
        when(keywordDailyRepository.findByStatDateOrderByMentionCountDesc(any())).thenReturn(items);

        List<KeywordTrendDto> result = dashboardService.getKeywordTrends(LocalDate.now());

        assertThat(result).hasSize(10);
    }

    @Test
    @DisplayName("status 없으면 전체 lifecycle 조회")
    void getLifecycle_noStatus() {
        when(lifecycleRepository.findAllByOrderByTrendScoreDesc()).thenReturn(List.of());

        dashboardService.getLifecycle(null);

        verify(lifecycleRepository).findAllByOrderByTrendScoreDesc();
        verify(lifecycleRepository, never()).findByStatusOrderByTrendScoreDesc(any());
    }

    @Test
    @DisplayName("status 있으면 status 필터 조회")
    void getLifecycle_withStatus() {
        when(lifecycleRepository.findByStatusOrderByTrendScoreDesc("EMERGING")).thenReturn(List.of());

        dashboardService.getLifecycle("EMERGING");

        verify(lifecycleRepository).findByStatusOrderByTrendScoreDesc("EMERGING");
    }

    @Test
    @DisplayName("직업 리스크 전체 조회")
    void getJobRisks() {
        when(jobAiRiskRepository.findAllByOrderByRiskScoreDesc()).thenReturn(List.of());

        List<JobRiskDto> result = dashboardService.getJobRisks();

        assertThat(result).isNotNull();
        verify(jobAiRiskRepository).findAllByOrderByRiskScoreDesc();
    }
}
