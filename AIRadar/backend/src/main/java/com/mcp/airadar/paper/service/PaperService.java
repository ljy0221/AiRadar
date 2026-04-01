package com.mcp.airadar.paper.service;

import com.mcp.airadar.paper.dto.PaperDto;
import com.mcp.airadar.paper.entity.Paper;
import com.mcp.airadar.paper.repository.PaperRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class PaperService {

    private static final int DEFAULT_PAGE_SIZE = 100;
    private static final int MAX_PAGE_SIZE = 100;

    private final PaperRepository paperRepository;

    public PaperService(PaperRepository paperRepository) {
        this.paperRepository = paperRepository;
    }

    public List<PaperDto.DailyGroup> getPaperList(String category, String researchArea, LocalDate date, LocalDate startDate, LocalDate endDate) {
        DateRange dateRange = resolveRange(date, startDate, endDate);
        return toDailyGroups(paperRepository.findRecentPaperFeed(category, researchArea, dateRange.startInclusive(), dateRange.endExclusive()));
    }

    public PaperDto.PagedFeed getPaperListPaged(
            String category,
            String researchArea,
            LocalDate date,
            LocalDate startDate,
            LocalDate endDate,
            LocalDateTime cursorPublishedAt,
            String cursorId,
            Integer size
    ) {
        DateRange dateRange = resolveRange(date, startDate, endDate);
        int pageSize = normalizePageSize(size);
        int fetchSize = pageSize + 1;

        boolean useCursorPaging = cursorPublishedAt != null && cursorId != null && !cursorId.isBlank();
        List<Paper> rows = useCursorPaging
                ? paperRepository.findRecentPaperFeedPage(
                        category,
                        researchArea,
                        dateRange.startInclusive(),
                        dateRange.endExclusive(),
                        cursorPublishedAt,
                        cursorId,
                        fetchSize
                )
                : paperRepository.findRecentPaperFeedFirstPage(
                        category,
                        researchArea,
                        dateRange.startInclusive(),
                        dateRange.endExclusive(),
                        fetchSize
                );

        boolean hasNext = rows.size() > pageSize;
        List<Paper> pageRows = hasNext ? rows.subList(0, pageSize) : rows;
        List<PaperDto.DailyGroup> groups = toDailyGroups(pageRows);

        PaperDto.PageCursor nextCursor = null;
        if (hasNext && !pageRows.isEmpty()) {
            Paper last = pageRows.get(pageRows.size() - 1);
            nextCursor = PaperDto.PageCursor.builder()
                    .publishedAt(last.getPublishedAt())
                    .id(last.getPaperId())
                    .build();
        }

        return PaperDto.PagedFeed.builder()
                .groups(groups)
                .nextCursor(nextCursor)
                .hasNext(hasNext)
                .build();
    }

    private DateRange resolveRange(LocalDate date, LocalDate startDate, LocalDate endDate) {
        LocalDateTime startInclusive;
        LocalDateTime endExclusive;

        if (date != null) {
            // 단일 날짜 우선
            startInclusive = date.atStartOfDay();
            endExclusive = date.plusDays(1).atStartOfDay();
        } else if (startDate != null || endDate != null) {
            // 범위 조회
            LocalDate from = startDate != null ? startDate : LocalDate.now().minusDays(9);
            LocalDate to = endDate != null ? endDate : LocalDate.now();
            startInclusive = from.atStartOfDay();
            endExclusive = to.plusDays(1).atStartOfDay();
        } else {
            // 기본: 최근 9일
            LocalDate baseDate = LocalDate.now();
            startInclusive = baseDate.minusDays(9).atStartOfDay();
            endExclusive = baseDate.plusDays(1).atStartOfDay();
        }
        return new DateRange(startInclusive, endExclusive);
    }

    private List<PaperDto.DailyGroup> toDailyGroups(List<Paper> rows) {
        Comparator<PaperDto.ListItem> itemComparator = Comparator
                .comparing(PaperDto.ListItem::publishedAt, Comparator.nullsLast(Comparator.reverseOrder()));

        Map<LocalDate, List<PaperDto.ListItem>> grouped = rows.stream()
                .map(PaperDto.ListItem::from)
                .filter(item -> item.publishedAt() != null)
                .collect(Collectors.groupingBy(item -> item.publishedAt().toLocalDate(), LinkedHashMap::new, Collectors.toList()));

        return grouped.entrySet().stream()
                .sorted(Map.Entry.<LocalDate, List<PaperDto.ListItem>>comparingByKey().reversed())
                .map(entry -> PaperDto.DailyGroup.builder()
                        .date(entry.getKey())
                        .items(entry.getValue().stream()
                                .sorted(itemComparator)
                                .toList())
                        .build())
                .toList();
    }

    private int normalizePageSize(Integer size) {
        if (size == null || size < 1) {
            return DEFAULT_PAGE_SIZE;
        }
        return Math.min(size, MAX_PAGE_SIZE);
    }

    public PaperDto.AvailableDates getAvailableDates(String category, String researchArea) {
        List<LocalDate> dates = paperRepository.findAvailableDateStrings(category, researchArea).stream()
                .map(LocalDate::parse)
                .toList();

        return PaperDto.AvailableDates.builder()
                .dates(dates)
                .count(dates.size())
                .startDate(dates.isEmpty() ? null : dates.get(dates.size() - 1))
                .endDate(dates.isEmpty() ? null : dates.get(0))
                .build();
    }

    public PaperDto.Detail getPaperDetail(String paperId) {
        Paper paper = paperRepository.findByPaperIdAndIsActiveTrue(paperId)
                .orElseThrow(() -> new EntityNotFoundException("Paper not found: " + paperId));
        return PaperDto.Detail.from(paper);
    }

    private record DateRange(LocalDateTime startInclusive, LocalDateTime endExclusive) {}
}
