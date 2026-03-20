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
        return NewsDto.ListItem.builder()
                .articleId("article-001")
                .title("sample title")
                .source("TechCrunch")
                .region("GLOBAL")
                .category("LLM")
                .sentiment("POSITIVE")
                .score(BigDecimal.valueOf(0.85))
                .publishedAt(LocalDateTime.of(2026, 3, 19, 8, 30))
                .summary("sample summary")
                .url("https://example.com/news/article-001")
                .build();
    }

    private NewsDto.DailyGroup sampleDailyGroup() {
        return NewsDto.DailyGroup.builder()
                .date(LocalDate.of(2026, 3, 19))
                .items(List.of(sampleListItem()))
                .build();
    }

    private NewsDto.Detail sampleDetail() {
        return NewsDto.Detail.builder()
                .articleId("article-001")
                .title("sample detail title")
                .content("content body")
                .url("https://example.com")
                .source("TechCrunch")
                .countryCode("US")
                .region("GLOBAL")
                .sentiment("POSITIVE")
                .keywords(new String[]{"RAG", "LLM"})
                .score(BigDecimal.valueOf(0.85))
                .summary("summary")
                .category("LLM")
                .viewCount(100L)
                .publishedAt(LocalDateTime.of(2026, 3, 19, 8, 30))
                .build();
    }

    @Test
    @DisplayName("given default params when get news list then returns wrapped success response")
    void givenDefaultParams_whenGetNewsList_thenReturnsWrappedSuccessResponse() throws Exception {
        // given
        when(newsService.getNewsList(isNull(), isNull(), isNull())).thenReturn(List.of(sampleDailyGroup()));

        // when then
        mockMvc.perform(get("/api/v1/news"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andExpect(jsonPath("$.path").value("/api/v1/news"))
                .andExpect(jsonPath("$.data[0].date").value("2026-03-19"))
                .andExpect(jsonPath("$.data[0].items[0].articleId").value("article-001"));
    }

    @Test
    @DisplayName("given region and date when get news list then keeps wrapped payload")
    void givenRegionAndDate_whenGetNewsList_thenKeepsWrappedPayload() throws Exception {
        // given
        when(newsService.getNewsList(eq("GLOBAL"), isNull(), eq(LocalDate.of(2026, 3, 19))))
                .thenReturn(List.of(sampleDailyGroup()));

        // when then
        mockMvc.perform(get("/api/v1/news")
                        .param("region", "GLOBAL")
                        .param("date", "2026-03-19"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].items").isArray());
    }

    @Test
    @DisplayName("given article id when get news detail then returns wrapped detail response")
    void givenArticleId_whenGetNewsDetail_thenReturnsWrappedDetailResponse() throws Exception {
        // given
        when(newsService.getNewsDetail("article-001")).thenReturn(sampleDetail());

        // when then
        mockMvc.perform(get("/api/v1/news/article-001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.path").value("/api/v1/news/article-001"))
                .andExpect(jsonPath("$.data.articleId").value("article-001"))
                .andExpect(jsonPath("$.data.title").value("sample detail title"));
    }

    @Test
    @DisplayName("given missing article id when get news detail then returns wrapped error response")
    void givenMissingArticleId_whenGetNewsDetail_thenReturnsWrappedErrorResponse() throws Exception {
        // given
        when(newsService.getNewsDetail("no-such")).thenThrow(new EntityNotFoundException("not found"));

        // when then
        mockMvc.perform(get("/api/v1/news/no-such"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("COMMON_005"))
                .andExpect(jsonPath("$.error.message").value("not found"))
                .andExpect(jsonPath("$.error.path").value("/api/v1/news/no-such"));
    }
}
