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
    @DisplayName("given date when get news list then groups by that date")
    void getNewsListWithDate() {
        LocalDate targetDate = LocalDate.of(2026, 3, 19);
        when(newsRepository.findRecentNewsFeed("GLOBAL", "LLM", targetDate.atStartOfDay(), targetDate.plusDays(1).atStartOfDay()))
                .thenReturn(List.of(sampleItem));

        List<NewsDto.DailyGroup> result = newsService.getNewsList("GLOBAL", "LLM", targetDate, null, null);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).date()).isEqualTo(targetDate);
        assertThat(result.get(0).items()).hasSize(1);
        assertThat(result.get(0).items().get(0).articleId()).isEqualTo("article-001");
        verify(newsRepository).findRecentNewsFeed("GLOBAL", "LLM", targetDate.atStartOfDay(), targetDate.plusDays(1).atStartOfDay());
    }

    @Test
    @DisplayName("given mixed scores when get news list then sorts higher score first")
    void getNewsListSortsByScoreWithinDate() {
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

        List<NewsDto.DailyGroup> result = newsService.getNewsList(null, null, targetDate, null, null);

        assertThat(result.get(0).items().get(0).articleId()).isEqualTo("article-001");
        assertThat(result.get(0).items().get(1).articleId()).isEqualTo("article-002");
    }

    @Test
    @DisplayName("given filters when get available news dates then returns descending date metadata")
    void getAvailableDates() {
        when(newsRepository.findAvailableDateStrings("GLOBAL", "LLM"))
                .thenReturn(List.of("2026-03-19", "2026-03-18"));

        NewsDto.AvailableDates result = newsService.getAvailableDates("GLOBAL", "LLM");

        assertThat(result.dates()).containsExactly(LocalDate.of(2026, 3, 19), LocalDate.of(2026, 3, 18));
        assertThat(result.count()).isEqualTo(2);
        assertThat(result.startDate()).isEqualTo(LocalDate.of(2026, 3, 18));
        assertThat(result.endDate()).isEqualTo(LocalDate.of(2026, 3, 19));
        verify(newsRepository).findAvailableDateStrings("GLOBAL", "LLM");
    }

    @Test
    @DisplayName("given no company param when get company news then returns five supported companies")
    void getCompanyNewsReturnsSupportedCompanies() {
        when(newsRepository.findCompanyNews("openai", 10)).thenReturn(List.of(sampleItem));
        when(newsRepository.findCompanyNews("microsoft", 10)).thenReturn(List.of());
        when(newsRepository.findCompanyNews("google", 10)).thenReturn(List.of());
        when(newsRepository.findCompanyNews("naver", 10)).thenReturn(List.of());
        when(newsRepository.findCompanyNews("kakao", 10)).thenReturn(List.of());

        List<NewsDto.CompanyNewsGroup> result = newsService.getCompanyNews(null, null);

        assertThat(result).hasSize(5);
        assertThat(result.get(0).company()).isEqualTo("openai");
        assertThat(result.get(0).items()).hasSize(1);
        verify(newsRepository).findCompanyNews("openai", 10);
        verify(newsRepository).findCompanyNews("microsoft", 10);
        verify(newsRepository).findCompanyNews("google", 10);
        verify(newsRepository).findCompanyNews("naver", 10);
        verify(newsRepository).findCompanyNews("kakao", 10);
    }

    @Test
    @DisplayName("given company and too large limit when get company news then caps at ten")
    void getCompanyNewsCapsLimitAtTen() {
        when(newsRepository.findCompanyNews("naver", 10)).thenReturn(List.of(sampleItem));

        List<NewsDto.CompanyNewsGroup> result = newsService.getCompanyNews("naver", 99);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).company()).isEqualTo("naver");
        assertThat(result.get(0).items()).hasSize(1);
        verify(newsRepository).findCompanyNews("naver", 10);
    }

    @Test
    @DisplayName("given uppercase company when get company news then normalizes key")
    void getCompanyNewsNormalizesCompany() {
        when(newsRepository.findCompanyNews("openai", 5)).thenReturn(List.of(sampleItem));

        List<NewsDto.CompanyNewsGroup> result = newsService.getCompanyNews("OpenAI", 5);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).company()).isEqualTo("openai");
        verify(newsRepository).findCompanyNews("openai", 5);
    }

    @Test
    @DisplayName("given unsupported company when get company news then throws")
    void getCompanyNewsThrowsForUnsupportedCompany() {
        assertThatThrownBy(() -> newsService.getCompanyNews("anthropic", 5))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessageContaining("anthropic");
    }

    @Test
    @DisplayName("given article id when get news detail then returns detail")
    void getNewsDetailFound() {
        when(newsRepository.findByArticleIdAndIsActiveTrue("abc123")).thenReturn(Optional.of(sampleItem));

        NewsDto.Detail detail = newsService.getNewsDetail("abc123");

        assertThat(detail).isNotNull();
    }

    @Test
    @DisplayName("given missing article id when get news detail then throws")
    void getNewsDetailNotFound() {
        when(newsRepository.findByArticleIdAndIsActiveTrue("no-such-id")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> newsService.getNewsDetail("no-such-id"))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessageContaining("no-such-id");
    }
}
