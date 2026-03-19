package com.mcp.airadar.news.controller;

import com.mcp.airadar.news.dto.NewsDto;
import com.mcp.airadar.news.service.NewsService;
import jakarta.persistence.EntityNotFoundException;
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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(NewsController.class)
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import({com.mcp.airadar.common.GlobalExceptionHandler.class, com.mcp.airadar.common.api.ApiResponseAdvice.class})
class NewsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private NewsService newsService;

    private NewsDto.ListItem sampleListItem() {
        return new NewsDto.ListItem(
                "article-001",
                "sample title",
                "TechCrunch",
                "GLOBAL",
                "LLM",
                "POSITIVE",
                BigDecimal.valueOf(0.85),
                LocalDateTime.of(2026, 3, 19, 8, 30),
                "sample summary",
                "https://example.com/news/article-001"
        );
    }

    private NewsDto.DailyGroup sampleDailyGroup() {
        return new NewsDto.DailyGroup(LocalDate.of(2026, 3, 19), List.of(sampleListItem()));
    }

    private NewsDto.Detail sampleDetail() {
        return new NewsDto.Detail(
                "article-001",
                "sample detail title",
                "content body",
                "https://example.com",
                "TechCrunch",
                "US",
                "GLOBAL",
                "POSITIVE",
                new String[]{"RAG", "LLM"},
                BigDecimal.valueOf(0.85),
                "summary",
                "LLM",
                100L,
                LocalDateTime.of(2026, 3, 19, 8, 30)
        );
    }

    @Test
    @DisplayName("GET /api/v1/news returns wrapped success response")
    void getNewsList_returns200() throws Exception {
        when(newsService.getNewsList(isNull(), isNull(), isNull())).thenReturn(List.of(sampleDailyGroup()));

        mockMvc.perform(get("/api/v1/news"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andExpect(jsonPath("$.path").value("/api/v1/news"))
                .andExpect(jsonPath("$.data[0].date").value("2026-03-19"))
                .andExpect(jsonPath("$.data[0].items[0].articleId").value("article-001"));
    }

    @Test
    @DisplayName("GET /api/v1/news with region and date keeps wrapped payload")
    void getNewsList_withRegionAndDate() throws Exception {
        when(newsService.getNewsList(eq("GLOBAL"), isNull(), eq(LocalDate.of(2026, 3, 19))))
                .thenReturn(List.of(sampleDailyGroup()));

        mockMvc.perform(get("/api/v1/news")
                        .param("region", "GLOBAL")
                        .param("date", "2026-03-19"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].items").isArray());
    }

    @Test
    @DisplayName("GET /api/v1/news/{id} returns wrapped detail response")
    void getNewsDetail_found() throws Exception {
        when(newsService.getNewsDetail("article-001")).thenReturn(sampleDetail());

        mockMvc.perform(get("/api/v1/news/article-001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.path").value("/api/v1/news/article-001"))
                .andExpect(jsonPath("$.data.articleId").value("article-001"))
                .andExpect(jsonPath("$.data.title").value("sample detail title"));
    }

    @Test
    @DisplayName("GET /api/v1/news/{id} returns wrapped error response on not found")
    void getNewsDetail_notFound() throws Exception {
        when(newsService.getNewsDetail("no-such")).thenThrow(new EntityNotFoundException("not found"));

        mockMvc.perform(get("/api/v1/news/no-such"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("COMMON_005"))
                .andExpect(jsonPath("$.error.message").value("not found"))
                .andExpect(jsonPath("$.error.path").value("/api/v1/news/no-such"));
    }
}
