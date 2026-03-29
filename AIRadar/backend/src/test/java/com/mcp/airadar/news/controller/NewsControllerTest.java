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

import static org.mockito.ArgumentMatchers.any;
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

    private NewsDto.CompanyNewsGroup sampleCompanyGroup() {
        return NewsDto.CompanyNewsGroup.builder()
                .company("naver")
                .items(List.of(sampleListItem()))
                .build();
    }

    private NewsDto.PagedFeed samplePagedFeed() {
        return NewsDto.PagedFeed.builder()
                .groups(List.of(sampleDailyGroup()))
                .nextCursor(NewsDto.PageCursor.builder()
                        .publishedAt(LocalDateTime.of(2026, 3, 19, 8, 30))
                        .id("article-001")
                        .build())
                .hasNext(true)
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
    void givenDefaultParamsWhenGetNewsListThenReturnsWrappedSuccessResponse() throws Exception {
        when(newsService.getNewsListPaged(isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(samplePagedFeed());

        mockMvc.perform(get("/api/v1/news"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andExpect(jsonPath("$.path").value("/api/v1/news"))
                .andExpect(jsonPath("$.data.groups[0].date").value("2026-03-19"))
                .andExpect(jsonPath("$.data.groups[0].items[0].articleId").value("article-001"))
                .andExpect(jsonPath("$.data.hasNext").value(true))
                .andExpect(jsonPath("$.data.nextCursor.id").value("article-001"));
    }

    @Test
    @DisplayName("given region and date when get news list then keeps wrapped payload")
    void givenRegionAndDateWhenGetNewsListThenKeepsWrappedPayload() throws Exception {
        when(newsService.getNewsListPaged(eq("GLOBAL"), isNull(), eq(LocalDate.of(2026, 3, 19)), isNull(), isNull(), isNull(), isNull(), isNull()))
                .thenReturn(samplePagedFeed());

        mockMvc.perform(get("/api/v1/news")
                        .param("region", "GLOBAL")
                        .param("date", "2026-03-19"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.groups[0].items").isArray());
    }

    @Test
    @DisplayName("given cursor params when get news list then passes cursor paging fields")
    void givenCursorParamsWhenGetNewsListThenPassesCursorPagingFields() throws Exception {
        when(newsService.getNewsListPaged(
                eq("GLOBAL"),
                eq("LLM"),
                isNull(),
                eq(LocalDate.of(2026, 3, 10)),
                eq(LocalDate.of(2026, 3, 19)),
                any(LocalDateTime.class),
                eq("article-123"),
                eq(30)
        )).thenReturn(samplePagedFeed());

        mockMvc.perform(get("/api/v1/news")
                        .param("region", "GLOBAL")
                        .param("category", "LLM")
                        .param("startDate", "2026-03-10")
                        .param("endDate", "2026-03-19")
                        .param("cursorPublishedAt", "2026-03-19T08:30:00")
                        .param("cursorId", "article-123")
                        .param("size", "30"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.groups").isArray());
    }

    @Test
    @DisplayName("given filters when get available news dates then returns wrapped metadata")
    void givenFiltersWhenGetAvailableNewsDatesThenReturnsWrappedMetadata() throws Exception {
        NewsDto.AvailableDates availableDates = NewsDto.AvailableDates.builder()
                .dates(List.of(LocalDate.of(2026, 3, 19), LocalDate.of(2026, 3, 18)))
                .count(2)
                .startDate(LocalDate.of(2026, 3, 18))
                .endDate(LocalDate.of(2026, 3, 19))
                .build();
        when(newsService.getAvailableDates("GLOBAL", "LLM")).thenReturn(availableDates);

        mockMvc.perform(get("/api/v1/news/available-dates")
                        .param("region", "GLOBAL")
                        .param("category", "LLM"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.path").value("/api/v1/news/available-dates"))
                .andExpect(jsonPath("$.data.count").value(2))
                .andExpect(jsonPath("$.data.startDate").value("2026-03-18"))
                .andExpect(jsonPath("$.data.endDate").value("2026-03-19"))
                .andExpect(jsonPath("$.data.dates[0]").value("2026-03-19"));
    }

    @Test
    @DisplayName("given company params when get company news then returns wrapped success response")
    void givenCompanyParamsWhenGetCompanyNewsThenReturnsWrappedSuccessResponse() throws Exception {
        when(newsService.getCompanyNews("naver", 5)).thenReturn(List.of(sampleCompanyGroup()));

        mockMvc.perform(get("/api/v1/news/companies")
                        .param("company", "naver")
                        .param("limit", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.path").value("/api/v1/news/companies"))
                .andExpect(jsonPath("$.data[0].company").value("naver"))
                .andExpect(jsonPath("$.data[0].items[0].articleId").value("article-001"));
    }

    @Test
    @DisplayName("given article id when get news detail then returns wrapped detail response")
    void givenArticleIdWhenGetNewsDetailThenReturnsWrappedDetailResponse() throws Exception {
        when(newsService.getNewsDetail("article-001")).thenReturn(sampleDetail());

        mockMvc.perform(get("/api/v1/news/article-001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.path").value("/api/v1/news/article-001"))
                .andExpect(jsonPath("$.data.articleId").value("article-001"))
                .andExpect(jsonPath("$.data.title").value("sample detail title"));
    }

    @Test
    @DisplayName("given missing article id when get news detail then returns wrapped error response")
    void givenMissingArticleIdWhenGetNewsDetailThenReturnsWrappedErrorResponse() throws Exception {
        when(newsService.getNewsDetail("no-such")).thenThrow(new EntityNotFoundException("not found"));

        mockMvc.perform(get("/api/v1/news/no-such"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("COMMON_005"))
                .andExpect(jsonPath("$.error.message").value("not found"))
                .andExpect(jsonPath("$.error.path").value("/api/v1/news/no-such"));
    }
}
