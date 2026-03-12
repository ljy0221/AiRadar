package com.mcp.airadar.news.controller;

import com.mcp.airadar.news.dto.NewsDto;
import com.mcp.airadar.news.service.NewsService;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(NewsController.class)
@ActiveProfiles("test")
class NewsControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private NewsService newsService;

    private NewsDto.ListItem sampleListItem() {
        return new NewsDto.ListItem(
                "article-001", "테스트 뉴스", "TechCrunch",
                "GLOBAL", "NLP", "POSITIVE",
                BigDecimal.valueOf(0.85), LocalDateTime.now()
        );
    }

    private NewsDto.Detail sampleDetail() {
        return new NewsDto.Detail(
                "article-001", "테스트 뉴스 상세", "본문 내용", "https://example.com",
                "TechCrunch", "US", "GLOBAL", "POSITIVE",
                new String[]{"RAG", "LLM"}, BigDecimal.valueOf(0.85),
                "요약 내용", "NLP", 100L, LocalDateTime.now()
        );
    }

    @Test
    @DisplayName("GET /api/news → 200 OK, Page 응답")
    void getNewsList_returns200() throws Exception {
        Page<NewsDto.ListItem> page = new PageImpl<>(List.of(sampleListItem()));
        when(newsService.getNewsList(isNull(), isNull(), any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/news"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content[0].articleId").value("article-001"));
    }

    @Test
    @DisplayName("GET /api/news?region=GLOBAL → 200 OK")
    void getNewsList_withRegion() throws Exception {
        Page<NewsDto.ListItem> page = new PageImpl<>(List.of(sampleListItem()));
        when(newsService.getNewsList(eq("GLOBAL"), isNull(), any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/news").param("region", "GLOBAL"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /api/news/{id} 존재 → 200 OK")
    void getNewsDetail_found() throws Exception {
        when(newsService.getNewsDetail("article-001")).thenReturn(sampleDetail());

        mockMvc.perform(get("/api/news/article-001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.articleId").value("article-001"))
                .andExpect(jsonPath("$.title").value("테스트 뉴스 상세"));
    }

    @Test
    @DisplayName("GET /api/news/{id} 없음 → 404")
    void getNewsDetail_notFound() throws Exception {
        when(newsService.getNewsDetail("no-such")).thenThrow(new EntityNotFoundException("없음"));

        mockMvc.perform(get("/api/news/no-such"))
                .andExpect(status().isNotFound());
    }
}
