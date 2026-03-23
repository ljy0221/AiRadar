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
            String reason   // ALS | KEYWORD_MATCH | COLD_START
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

    /**
     * 추천 논문 응답
     */
    public record PaperItem(
            String paperId,
            String title,
            String[] authors,
            String category,
            String researchArea,
            String[] keywords,
            String summary,
            LocalDateTime publishedAt,
            String reason   // KEYWORD_MATCH | COLD_START
    ) {
        public static PaperItem from(com.mcp.airadar.paper.entity.Paper p, String reason) {
            return new PaperItem(
                    p.getPaperId(),
                    p.getTitle(),
                    p.getAuthors(),
                    p.getCategory(),
                    p.getResearchArea(),
                    p.getKeywords(),
                    p.getSummary(),
                    p.getPublishedAt(),
                    reason
            );
        }
    }
}
