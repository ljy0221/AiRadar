package com.mcp.airadar.news.dto;

import com.mcp.airadar.news.entity.NewsItem;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class NewsDto {

    public record ListItem(
            String articleId,
            String title,
            String source,
            String region,
            String category,
            String sentiment,
            BigDecimal score,
            LocalDateTime publishedAt
    ) {
        public static ListItem from(NewsItem e) {
            return new ListItem(
                    e.getArticleId(),
                    e.getTitle(),
                    e.getSource(),
                    e.getRegion(),
                    e.getCategory(),
                    e.getSentiment(),
                    e.getScore(),
                    e.getPublishedAt()
            );
        }
    }

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
            return new Detail(
                    e.getArticleId(),
                    e.getTitle(),
                    e.getContent(),
                    e.getUrl(),
                    e.getSource(),
                    e.getCountryCode(),
                    e.getRegion(),
                    e.getSentiment(),
                    e.getKeywords(),
                    e.getScore(),
                    e.getSummary(),
                    e.getCategory(),
                    e.getViewCount(),
                    e.getPublishedAt()
            );
        }
    }
}
