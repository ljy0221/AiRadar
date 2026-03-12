package com.mcp.airadar.dashboard.controller;

import com.mcp.airadar.dashboard.dto.JobRiskDto;
import com.mcp.airadar.dashboard.dto.KeywordTrendDto;
import com.mcp.airadar.dashboard.dto.LifecycleDto;
import com.mcp.airadar.dashboard.service.DashboardService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(DashboardController.class)
@ActiveProfiles("test")
class DashboardControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private DashboardService dashboardService;

    @Test
    @DisplayName("GET /api/dashboard/keywords → 200 OK, 목록 반환")
    void getKeywordTrends_returns200() throws Exception {
        KeywordTrendDto dto = new KeywordTrendDto(
                "RAG", LocalDate.now(), "NEWS", 50, 10, BigDecimal.valueOf(0.7)
        );
        when(dashboardService.getKeywordTrends(isNull())).thenReturn(List.of(dto));

        mockMvc.perform(get("/api/dashboard/keywords"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].keyword").value("RAG"));
    }

    @Test
    @DisplayName("GET /api/dashboard/lifecycle → 200 OK")
    void getLifecycle_returns200() throws Exception {
        LifecycleDto dto = new LifecycleDto(
                "RAG", "GROWING", null, null,
                BigDecimal.valueOf(8.5), BigDecimal.valueOf(0.3),
                BigDecimal.valueOf(15.0), new String[]{"LLM"}
        );
        when(dashboardService.getLifecycle(isNull())).thenReturn(List.of(dto));

        mockMvc.perform(get("/api/dashboard/lifecycle"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].keyword").value("RAG"))
                .andExpect(jsonPath("$[0].status").value("GROWING"));
    }

    @Test
    @DisplayName("GET /api/dashboard/jobs → 200 OK")
    void getJobRisks_returns200() throws Exception {
        JobRiskDto dto = new JobRiskDto(
                "데이터 분석가", "데이터", "MEDIUM",
                BigDecimal.valueOf(5.5), new String[]{"창의력"},
                new String[]{"Python"}, new String[]{"ChatGPT"}
        );
        when(dashboardService.getJobRisks()).thenReturn(List.of(dto));

        mockMvc.perform(get("/api/dashboard/jobs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].jobType").value("데이터 분석가"));
    }
}
