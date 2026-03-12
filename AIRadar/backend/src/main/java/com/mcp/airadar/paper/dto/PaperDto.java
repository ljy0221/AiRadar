package com.mcp.airadar.paper.dto;

import com.mcp.airadar.paper.entity.Paper;

import java.time.LocalDateTime;

public class PaperDto {

    public record ListItem(
            String paperId,
            String title,
            String source,
            String[] authors,
            String researchArea,
            String category,
            LocalDateTime publishedAt
    ) {
        public static ListItem from(Paper e) {
            return new ListItem(
                    e.getPaperId(),
                    e.getTitle(),
                    e.getSource(),
                    e.getAuthors(),
                    e.getResearchArea(),
                    e.getCategory(),
                    e.getPublishedAt()
            );
        }
    }

    public record Detail(
            String paperId,
            String title,
            String abstractText,
            String url,
            String source,
            String[] authors,
            String researchArea,
            String[] keywords,
            String summary,
            String category,
            LocalDateTime publishedAt
    ) {
        public static Detail from(Paper e) {
            return new Detail(
                    e.getPaperId(),
                    e.getTitle(),
                    e.getAbstractText(),
                    e.getUrl(),
                    e.getSource(),
                    e.getAuthors(),
                    e.getResearchArea(),
                    e.getKeywords(),
                    e.getSummary(),
                    e.getCategory(),
                    e.getPublishedAt()
            );
        }
    }
}
