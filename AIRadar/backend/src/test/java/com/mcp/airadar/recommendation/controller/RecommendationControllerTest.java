package com.mcp.airadar.recommendation.controller;

import com.mcp.airadar.recommendation.dto.RecommendationDto;
import com.mcp.airadar.recommendation.service.RecommendationService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(RecommendationController.class)
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import({com.mcp.airadar.common.GlobalExceptionHandler.class, com.mcp.airadar.common.api.ApiResponseAdvice.class})
class RecommendationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private RecommendationService recommendationService;

    private RecommendationDto.NewsItem sampleItem(String reason) {
        return new RecommendationDto.NewsItem(
                "art-001",
                "ALS 추천 기사",
                "TechCrunch",
                "GLOBAL",
                "AI",
                "POSITIVE",
                BigDecimal.valueOf(0.9),
                new String[]{"AI", "GPU"},
                LocalDateTime.of(2026, 3, 20, 9, 0),
                reason
        );
    }

    // ─── GET /api/v1/recommendations/news ────────────────────────────────────

    @Test
    @DisplayName("정상 요청 시 200 OK와 추천 기사 목록 반환")
    void getPersonalizedFeed_validRequest_returns200WithItems() throws Exception {
        when(recommendationService.getPersonalizedFeed(isNull(), eq(20)))
                .thenReturn(List.of(sampleItem("KEYWORD_MATCH")));

        mockMvc.perform(get("/api/v1/recommendations/news"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].articleId").value("art-001"))
                .andExpect(jsonPath("$.data[0].reason").value("KEYWORD_MATCH"));
    }

    @Test
    @DisplayName("size 파라미터를 지정하면 해당 값으로 서비스 호출")
    void getPersonalizedFeed_customSize_passedToService() throws Exception {
        when(recommendationService.getPersonalizedFeed(isNull(), eq(30)))
                .thenReturn(List.of(sampleItem("ALS")));

        mockMvc.perform(get("/api/v1/recommendations/news").param("size", "30"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].reason").value("ALS"));
    }

    @Test
    @DisplayName("추천 결과가 없으면 200 OK에 빈 배열 반환")
    void getPersonalizedFeed_noResults_returnsEmptyArray() throws Exception {
        when(recommendationService.getPersonalizedFeed(isNull(), eq(20)))
                .thenReturn(List.of());

        mockMvc.perform(get("/api/v1/recommendations/news"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data").isEmpty());
    }

    @Test
    @DisplayName("Cold Start 결과에 reason=COLD_START 포함")
    void getPersonalizedFeed_coldStart_returnsColdStartReason() throws Exception {
        when(recommendationService.getPersonalizedFeed(isNull(), eq(20)))
                .thenReturn(List.of(sampleItem("COLD_START")));

        mockMvc.perform(get("/api/v1/recommendations/news"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].reason").value("COLD_START"));
    }
}
