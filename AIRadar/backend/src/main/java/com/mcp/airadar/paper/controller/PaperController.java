package com.mcp.airadar.paper.controller;

import com.mcp.airadar.paper.dto.PaperDto;
import com.mcp.airadar.paper.service.PaperService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/papers")
public class PaperController {

    private final PaperService paperService;

    public PaperController(PaperService paperService) {
        this.paperService = paperService;
    }

    @GetMapping
    public ResponseEntity<Page<PaperDto.ListItem>> getPaperList(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String researchArea,
            @PageableDefault(size = 20, sort = "publishedAt") Pageable pageable
    ) {
        return ResponseEntity.ok(paperService.getPaperList(category, researchArea, pageable));
    }

    @GetMapping("/{paperId}")
    public ResponseEntity<PaperDto.Detail> getPaperDetail(@PathVariable String paperId) {
        return ResponseEntity.ok(paperService.getPaperDetail(paperId));
    }
}
