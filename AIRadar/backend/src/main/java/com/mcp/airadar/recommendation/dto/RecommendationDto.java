package com.mcp.airadar.recommendation.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public class RecommendationDto {

    /**
     * 추천 뉴스 응답 — ListItem에 추천 이유(reason)를 추가
     */
    public record NewsItem(
            String articleId,
            String title,
            String source,
            String region,
            String category,
            String sentiment,
            BigDecimal score,
            String[] keywords,
            LocalDateTime publishedAt,
            String reason   // KEYWORD_MATCH | TRENDING | COLD_START
    ) {
        public static NewsItem from(com.mcp.airadar.news.entity.NewsItem e, String reason) {
            return new NewsItem(
                    e.getArticleId(),
                    e.getTitle(),
                    e.getSource(),
                    e.getRegion(),
                    e.getCategory(),
                    e.getSentiment(),
                    e.getScore(),
                    e.getKeywords(),
                    e.getPublishedAt(),
                    reason
            );
        }
    }
}
