package com.mcp.airadar.news.dto;

import com.mcp.airadar.news.entity.NewsItem;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public class NewsDto {

    @Builder
    public record ListItem(
            String articleId,
            String title,
            String source,
            String region,
            String category,
            String sentiment,
            BigDecimal score,
            LocalDateTime publishedAt,
            String summary,
            String url
    ) {
        public static ListItem from(NewsItem e) {
            return ListItem.builder()
                    .articleId(e.getArticleId())
                    .title(e.getTitle())
                    .source(e.getSource())
                    .region(e.getRegion())
                    .category(e.getCategory())
                    .sentiment(e.getSentiment())
                    .score(e.getScore())
                    .publishedAt(e.getPublishedAt())
                    .summary(e.getSummary())
                    .url(e.getUrl())
                    .build();
        }
    }

    @Builder
    public record DailyGroup(
            LocalDate date,
            List<ListItem> items
    ) {}

    @Builder
    public record AvailableDates(
            List<LocalDate> dates,
            int count,
            LocalDate startDate,
            LocalDate endDate
    ) {}

    @Builder
    public record CompanyNewsGroup(
            String company,
            List<ListItem> items
    ) {}

    public static final Map<String, String> COMPANY_DISPLAY_NAMES = Map.of(
            "openai", "openai",
            "microsoft", "microsoft",
            "google", "google",
            "naver", "naver",
            "kakao", "kakao"
    );

    @Builder
    public record Detail(
            String articleId,
            String title,
            String content,
            String url,
            String source,
            String countryCode,
            String region,
            String sentiment,
            String[] keywords,
            BigDecimal score,
            String summary,
            String category,
            Long viewCount,
            LocalDateTime publishedAt
    ) {
        public static Detail from(NewsItem e) {
            return Detail.builder()
                    .articleId(e.getArticleId())
                    .title(e.getTitle())
                    .content(e.getContent())
                    .url(e.getUrl())
                    .source(e.getSource())
                    .countryCode(e.getCountryCode())
                    .region(e.getRegion())
                    .sentiment(e.getSentiment())
                    .keywords(e.getKeywords())
                    .score(e.getScore())
                    .summary(e.getSummary())
                    .category(e.getCategory())
                    .viewCount(e.getViewCount())
                    .publishedAt(e.getPublishedAt())
                    .build();
        }
    }
}
