package com.mcp.airadar.news.controller;

import com.mcp.airadar.news.dto.NewsDto;
import com.mcp.airadar.news.service.NewsService;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
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
                "article-001", "sample title", "TechCrunch",
                "GLOBAL", "NLP", "POSITIVE",
                BigDecimal.valueOf(0.85), LocalDateTime.now()
        );
    }

    private NewsDto.Detail sampleDetail() {
        return new NewsDto.Detail(
                "article-001", "sample detail title", "summary", "https://example.com",
                "TechCrunch", "US", "GLOBAL", "POSITIVE",
                new String[]{"RAG", "LLM"}, BigDecimal.valueOf(0.85),
                "content", "NLP", 100L, LocalDateTime.now()
        );
    }

    @Test
    @DisplayName("GET /api/news returns wrapped success response")
    void getNewsList_returns200() throws Exception {
        Page<NewsDto.ListItem> page = new PageImpl<>(List.of(sampleListItem()));
        when(newsService.getNewsList(isNull(), isNull(), any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/news"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.code").value("SUCCESS"))
                .andExpect(jsonPath("$.message").value("성공입니다."))
                .andExpect(jsonPath("$.path").value("/api/news"))
                .andExpect(jsonPath("$.data.content[0].articleId").value("article-001"));
    }

    @Test
    @DisplayName("GET /api/news with region keeps wrapped payload")
    void getNewsList_withRegion() throws Exception {
        Page<NewsDto.ListItem> page = new PageImpl<>(List.of(sampleListItem()));
        when(newsService.getNewsList(eq("GLOBAL"), isNull(), any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/news").param("region", "GLOBAL"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content").isArray());
    }

    @Test
    @DisplayName("GET /api/news/{id} returns wrapped detail response")
    void getNewsDetail_found() throws Exception {
        when(newsService.getNewsDetail("article-001")).thenReturn(sampleDetail());

        mockMvc.perform(get("/api/news/article-001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.path").value("/api/news/article-001"))
                .andExpect(jsonPath("$.data.articleId").value("article-001"))
                .andExpect(jsonPath("$.data.title").value("sample detail title"));
    }

    @Test
    @DisplayName("GET /api/news/{id} returns wrapped error response on not found")
    void getNewsDetail_notFound() throws Exception {
        when(newsService.getNewsDetail("no-such")).thenThrow(new EntityNotFoundException("not found"));

        mockMvc.perform(get("/api/news/no-such"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("COMMON_005"))
                .andExpect(jsonPath("$.error.message").value("not found"))
                .andExpect(jsonPath("$.error.path").value("/api/news/no-such"));
    }
}
