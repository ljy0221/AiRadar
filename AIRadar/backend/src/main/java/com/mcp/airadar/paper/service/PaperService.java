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
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class PaperService {

    private final PaperRepository paperRepository;

    public PaperService(PaperRepository paperRepository) {
        this.paperRepository = paperRepository;
    }

    public List<PaperDto.DailyGroup> getPaperList(String category, String researchArea, LocalDate date) {
        LocalDate baseDate = date != null ? date : LocalDate.now();
        LocalDateTime startInclusive = date != null
                ? baseDate.atStartOfDay()
                : baseDate.minusDays(9).atStartOfDay();
        LocalDateTime endExclusive = baseDate.plusDays(1).atStartOfDay();

        Comparator<PaperDto.ListItem> itemComparator = Comparator
                .comparing(PaperDto.ListItem::publishedAt, Comparator.nullsLast(Comparator.reverseOrder()));

        Map<LocalDate, List<PaperDto.ListItem>> grouped = paperRepository
                .findRecentPaperFeed(category, researchArea, startInclusive, endExclusive).stream()
                .map(PaperDto.ListItem::from)
                .filter(item -> item.publishedAt() != null)
                .collect(Collectors.groupingBy(item -> item.publishedAt().toLocalDate()));

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

    public PaperDto.Detail getPaperDetail(String paperId) {
        Paper paper = paperRepository.findByPaperIdAndIsActiveTrue(paperId)
                .orElseThrow(() -> new EntityNotFoundException("Paper not found: " + paperId));
        return PaperDto.Detail.from(paper);
    }
}
