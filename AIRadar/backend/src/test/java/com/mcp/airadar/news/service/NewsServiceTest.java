package com.mcp.airadar.news.service;

import com.mcp.airadar.news.dto.NewsDto;
import com.mcp.airadar.news.entity.NewsItem;
import com.mcp.airadar.news.repository.NewsRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class NewsServiceTest {

    @Mock
    private NewsRepository newsRepository;

    @InjectMocks
    private NewsService newsService;

    private NewsItem sampleItem;

    @BeforeEach
    void setUp() {
        sampleItem = new NewsItem();
        ReflectionTestUtils.setField(sampleItem, "articleId", "article-001");
        ReflectionTestUtils.setField(sampleItem, "title", "sample title");
        ReflectionTestUtils.setField(sampleItem, "source", "TechCrunch");
        ReflectionTestUtils.setField(sampleItem, "region", "GLOBAL");
        ReflectionTestUtils.setField(sampleItem, "category", "LLM");
        ReflectionTestUtils.setField(sampleItem, "sentiment", "POSITIVE");
        ReflectionTestUtils.setField(sampleItem, "score", BigDecimal.valueOf(0.85));
        ReflectionTestUtils.setField(sampleItem, "summary", "sample summary");
        ReflectionTestUtils.setField(sampleItem, "url", "https://example.com/news/article-001");
        ReflectionTestUtils.setField(sampleItem, "publishedAt", LocalDateTime.of(2026, 3, 19, 8, 30));
    }

    @Test
    @DisplayName("date가 있으면 해당 날짜만 조회")
    void getNewsList_withDate() {
        LocalDate targetDate = LocalDate.of(2026, 3, 19);
        when(newsRepository.findRecentNewsFeed("GLOBAL", "LLM", targetDate.atStartOfDay(), targetDate.plusDays(1).atStartOfDay()))
                .thenReturn(List.of(sampleItem));

        List<NewsDto.DailyGroup> result = newsService.getNewsList("GLOBAL", "LLM", targetDate);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).date()).isEqualTo(targetDate);
        assertThat(result.get(0).items()).hasSize(1);
        assertThat(result.get(0).items().get(0).articleId()).isEqualTo("article-001");
        verify(newsRepository).findRecentNewsFeed("GLOBAL", "LLM", targetDate.atStartOfDay(), targetDate.plusDays(1).atStartOfDay());
    }

    @Test
    @DisplayName("같은 날짜 내에서는 score 내림차순으로 정렬")
    void getNewsList_sortsByScoreWithinDate() {
        NewsItem lowerScoreItem = new NewsItem();
        ReflectionTestUtils.setField(lowerScoreItem, "articleId", "article-002");
        ReflectionTestUtils.setField(lowerScoreItem, "title", "lower score");
        ReflectionTestUtils.setField(lowerScoreItem, "source", "Reuters");
        ReflectionTestUtils.setField(lowerScoreItem, "region", "GLOBAL");
        ReflectionTestUtils.setField(lowerScoreItem, "category", "LLM");
        ReflectionTestUtils.setField(lowerScoreItem, "sentiment", "NEUTRAL");
        ReflectionTestUtils.setField(lowerScoreItem, "score", BigDecimal.valueOf(0.42));
        ReflectionTestUtils.setField(lowerScoreItem, "summary", "lower summary");
        ReflectionTestUtils.setField(lowerScoreItem, "url", "https://example.com/news/article-002");
        ReflectionTestUtils.setField(lowerScoreItem, "publishedAt", LocalDateTime.of(2026, 3, 19, 9, 30));

        LocalDate targetDate = LocalDate.of(2026, 3, 19);
        when(newsRepository.findRecentNewsFeed(null, null, targetDate.atStartOfDay(), targetDate.plusDays(1).atStartOfDay()))
                .thenReturn(List.of(lowerScoreItem, sampleItem));

        List<NewsDto.DailyGroup> result = newsService.getNewsList(null, null, targetDate);

        assertThat(result.get(0).items().get(0).articleId()).isEqualTo("article-001");
        assertThat(result.get(0).items().get(1).articleId()).isEqualTo("article-002");
    }

    @Test
    @DisplayName("찾는 articleId가 있으면 Detail 반환")
    void getNewsDetail_found() {
        when(newsRepository.findByArticleIdAndIsActiveTrue("abc123")).thenReturn(Optional.of(sampleItem));

        NewsDto.Detail detail = newsService.getNewsDetail("abc123");

        assertThat(detail).isNotNull();
    }

    @Test
    @DisplayName("없는 articleId면 EntityNotFoundException 발생")
    void getNewsDetail_notFound() {
        when(newsRepository.findByArticleIdAndIsActiveTrue("no-such-id")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> newsService.getNewsDetail("no-such-id"))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessageContaining("no-such-id");
    }
}
