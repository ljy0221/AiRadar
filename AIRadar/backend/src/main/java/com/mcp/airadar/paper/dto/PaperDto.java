package com.mcp.airadar.paper.dto;

import com.mcp.airadar.paper.entity.Paper;
import lombok.Builder;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public class PaperDto {

    @Builder
    public record ListItem(
            String paperId,
            String title,
            String url,
            String source,
            String[] authors,
            String researchArea,
            String category,
            String summary,
            LocalDateTime publishedAt
    ) {
        public static ListItem from(Paper e) {
            return ListItem.builder()
                    .paperId(e.getPaperId())
                    .title(e.getTitle())
                    .url(e.getUrl())
                    .source(e.getSource())
                    .authors(e.getAuthors())
                    .researchArea(e.getResearchArea())
                    .category(e.getCategory())
                    .summary(e.getSummary())
                    .publishedAt(e.getPublishedAt())
                    .build();
        }
    }

    @Builder
    public record DailyGroup(
            LocalDate date,
            List<ListItem> items
    ) {}

    @Builder
    public record PageCursor(
            LocalDateTime publishedAt,
            String id
    ) {}

    @Builder
    public record PagedFeed(
            List<DailyGroup> groups,
            PageCursor nextCursor,
            boolean hasNext
    ) {}

    @Builder
    public record AvailableDates(
            List<LocalDate> dates,
            int count,
            LocalDate startDate,
            LocalDate endDate
    ) {}

    @Builder
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
            return Detail.builder()
                    .paperId(e.getPaperId())
                    .title(e.getTitle())
                    .abstractText(e.getAbstractText())
                    .url(e.getUrl())
                    .source(e.getSource())
                    .authors(e.getAuthors())
                    .researchArea(e.getResearchArea())
                    .keywords(e.getKeywords())
                    .summary(e.getSummary())
                    .category(e.getCategory())
                    .publishedAt(e.getPublishedAt())
                    .build();
        }
    }
}
