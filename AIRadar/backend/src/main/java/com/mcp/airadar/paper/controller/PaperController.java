package com.mcp.airadar.paper.controller;

import com.mcp.airadar.paper.dto.PaperDto;
import com.mcp.airadar.paper.service.PaperService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/v1/papers")
public class PaperController {

    private final PaperService paperService;

    public PaperController(PaperService paperService) {
        this.paperService = paperService;
    }

    @GetMapping
    public ResponseEntity<List<PaperDto.DailyGroup>> getPaperList(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String researchArea,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        return ResponseEntity.ok(paperService.getPaperList(
                category,
                researchArea,
                date,
                startDate,
                endDate
        ));
    }

    @GetMapping("/paged")
    public ResponseEntity<PaperDto.PagedFeed> getPaperListPaged(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String researchArea,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime cursorPublishedAt,
            @RequestParam(required = false) String cursorId,
            @RequestParam(required = false) Integer size
    ) {
        return ResponseEntity.ok(paperService.getPaperListPaged(
                category,
                researchArea,
                date,
                startDate,
                endDate,
                cursorPublishedAt,
                cursorId,
                size
        ));
    }

    @GetMapping("/available-dates")
    public ResponseEntity<PaperDto.AvailableDates> getAvailableDates(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String researchArea
    ) {
        return ResponseEntity.ok(paperService.getAvailableDates(category, researchArea));
    }

    @GetMapping("/{paperId}")
    public ResponseEntity<PaperDto.Detail> getPaperDetail(@PathVariable String paperId) {
        return ResponseEntity.ok(paperService.getPaperDetail(paperId));
    }
}
