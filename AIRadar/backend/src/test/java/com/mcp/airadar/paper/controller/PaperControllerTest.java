package com.mcp.airadar.paper.controller;

import com.mcp.airadar.paper.dto.PaperDto;
import com.mcp.airadar.paper.service.PaperService;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(PaperController.class)
@ActiveProfiles("test")
@Import(com.mcp.airadar.common.GlobalExceptionHandler.class)
class PaperControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PaperService paperService;

    private PaperDto.ListItem sampleListItem() {
        return new PaperDto.ListItem(
                "paper-001", "Attention Is All You Need", "arxiv",
                new String[]{"Vaswani"}, "cs.CL", "NLP", LocalDateTime.now()
        );
    }

    private PaperDto.Detail sampleDetail() {
        return new PaperDto.Detail(
                "paper-001", "Attention Is All You Need",
                "We propose the Transformer...", "https://arxiv.org/abs/1706.03762",
                "arxiv", new String[]{"Vaswani"}, "cs.CL",
                new String[]{"transformer", "attention"}, "트랜스포머 모델 제안",
                "NLP", LocalDateTime.now()
        );
    }

    @Test
    @DisplayName("GET /api/papers → 200 OK")
    void getPaperList_returns200() throws Exception {
        Page<PaperDto.ListItem> page = new PageImpl<>(List.of(sampleListItem()));
        when(paperService.getPaperList(isNull(), isNull(), any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/papers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].paperId").value("paper-001"));
    }

    @Test
    @DisplayName("GET /api/papers/{id} 존재 → 200 OK")
    void getPaperDetail_found() throws Exception {
        when(paperService.getPaperDetail("paper-001")).thenReturn(sampleDetail());

        mockMvc.perform(get("/api/papers/paper-001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.paperId").value("paper-001"));
    }

    @Test
    @DisplayName("GET /api/papers/{id} 없음 → 404")
    void getPaperDetail_notFound() throws Exception {
        when(paperService.getPaperDetail("no-paper")).thenThrow(new EntityNotFoundException("없음"));

        mockMvc.perform(get("/api/papers/no-paper"))
                .andExpect(status().isNotFound());
    }
}
