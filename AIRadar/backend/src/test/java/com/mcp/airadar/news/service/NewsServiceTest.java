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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NewsServiceTest {

    @Mock
    private NewsRepository newsRepository;

    @InjectMocks
    private NewsService newsService;

    private Pageable pageable;
    private NewsItem sampleItem;

    @BeforeEach
    void setUp() {
        pageable = PageRequest.of(0, 20);
        sampleItem = new NewsItem();
    }

    @Test
    @DisplayName("region + category 둘 다 없으면 전체 조회")
    void getNewsList_noFilter() {
        Page<NewsItem> page = new PageImpl<>(List.of(sampleItem));
        when(newsRepository.findByIsActiveTrueOrderByPublishedAtDesc(pageable)).thenReturn(page);

        Page<NewsDto.ListItem> result = newsService.getNewsList(null, null, pageable);

        assertThat(result).isNotNull();
        verify(newsRepository).findByIsActiveTrueOrderByPublishedAtDesc(pageable);
        verify(newsRepository, never()).findByIsActiveTrueAndRegionOrderByPublishedAtDesc(any(), any());
        verify(newsRepository, never()).findByIsActiveTrueAndCategoryOrderByPublishedAtDesc(any(), any());
        verify(newsRepository, never()).findByIsActiveTrueAndRegionAndCategoryOrderByPublishedAtDesc(any(), any(), any());
    }

    @Test
    @DisplayName("region만 있으면 region 필터 조회")
    void getNewsList_regionOnly() {
        Page<NewsItem> page = new PageImpl<>(List.of(sampleItem));
        when(newsRepository.findByIsActiveTrueAndRegionOrderByPublishedAtDesc(eq("DOMESTIC"), eq(pageable)))
                .thenReturn(page);

        newsService.getNewsList("DOMESTIC", null, pageable);

        verify(newsRepository).findByIsActiveTrueAndRegionOrderByPublishedAtDesc("DOMESTIC", pageable);
    }

    @Test
    @DisplayName("category만 있으면 category 필터 조회")
    void getNewsList_categoryOnly() {
        Page<NewsItem> page = new PageImpl<>(List.of(sampleItem));
        when(newsRepository.findByIsActiveTrueAndCategoryOrderByPublishedAtDesc(eq("NLP"), eq(pageable)))
                .thenReturn(page);

        newsService.getNewsList(null, "NLP", pageable);

        verify(newsRepository).findByIsActiveTrueAndCategoryOrderByPublishedAtDesc("NLP", pageable);
    }

    @Test
    @DisplayName("region + category 둘 다 있으면 복합 필터 조회")
    void getNewsList_regionAndCategory() {
        Page<NewsItem> page = new PageImpl<>(List.of(sampleItem));
        when(newsRepository.findByIsActiveTrueAndRegionAndCategoryOrderByPublishedAtDesc(
                eq("GLOBAL"), eq("Vision"), eq(pageable))).thenReturn(page);

        newsService.getNewsList("GLOBAL", "Vision", pageable);

        verify(newsRepository).findByIsActiveTrueAndRegionAndCategoryOrderByPublishedAtDesc("GLOBAL", "Vision", pageable);
    }

    @Test
    @DisplayName("존재하는 articleId 조회 → Detail 반환")
    void getNewsDetail_found() {
        when(newsRepository.findByArticleIdAndIsActiveTrue("abc123")).thenReturn(Optional.of(sampleItem));

        NewsDto.Detail detail = newsService.getNewsDetail("abc123");

        assertThat(detail).isNotNull();
    }

    @Test
    @DisplayName("없는 articleId 조회 → EntityNotFoundException 발생")
    void getNewsDetail_notFound() {
        when(newsRepository.findByArticleIdAndIsActiveTrue("no-such-id")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> newsService.getNewsDetail("no-such-id"))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessageContaining("no-such-id");
    }
}
