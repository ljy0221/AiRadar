package com.mcp.airadar.dashboard.controller;

import com.mcp.airadar.dashboard.dto.JobRiskDto;
import com.mcp.airadar.dashboard.dto.KeywordTrendDto;
import com.mcp.airadar.dashboard.dto.LifecycleDto;
import com.mcp.airadar.dashboard.service.DashboardService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(DashboardController.class)
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import(com.mcp.airadar.common.api.ApiResponseAdvice.class)
class DashboardControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private DashboardService dashboardService;

    @Test
    @DisplayName("GET /api/v1/dashboard/keywords returns wrapped success response")
    void getKeywordTrends_returns200() throws Exception {
        KeywordTrendDto dto = new KeywordTrendDto(
                "RAG", LocalDate.now(), "NEWS", 50, 10, BigDecimal.valueOf(0.7)
        );
        when(dashboardService.getKeywordTrends(isNull())).thenReturn(List.of(dto));

        mockMvc.perform(get("/api/v1/dashboard/keywords"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].keyword").value("RAG"));
    }

    @Test
    @DisplayName("GET /api/v1/dashboard/lifecycle returns wrapped success response")
    void getLifecycle_returns200() throws Exception {
        LifecycleDto dto = new LifecycleDto(
                "RAG", "GROWING", null, null,
                BigDecimal.valueOf(8.5), BigDecimal.valueOf(0.3),
                BigDecimal.valueOf(15.0), new String[]{"LLM"}
        );
        when(dashboardService.getLifecycle(isNull())).thenReturn(List.of(dto));

        mockMvc.perform(get("/api/v1/dashboard/lifecycle"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].keyword").value("RAG"))
                .andExpect(jsonPath("$.data[0].status").value("GROWING"));
    }

    @Test
    @DisplayName("GET /api/v1/dashboard/jobs returns wrapped success response")
    void getJobRisks_returns200() throws Exception {
        JobRiskDto dto = new JobRiskDto(
                "AI Engineer", "description", "MEDIUM",
                BigDecimal.valueOf(5.5), new String[]{"LLM"},
                new String[]{"Python"}, new String[]{"ChatGPT"}
        );
        when(dashboardService.getJobRisks()).thenReturn(List.of(dto));

        mockMvc.perform(get("/api/v1/dashboard/jobs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].jobType").value("AI Engineer"));
    }
}
