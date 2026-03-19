package com.mcp.airadar.paper.controller;

import com.mcp.airadar.paper.dto.PaperDto;
import com.mcp.airadar.paper.service.PaperService;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
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

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PaperController.class)
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import({com.mcp.airadar.common.GlobalExceptionHandler.class, com.mcp.airadar.common.api.ApiResponseAdvice.class})
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
                new String[]{"transformer", "attention"}, "summary",
                "NLP", LocalDateTime.now()
        );
    }

    @Test
    @DisplayName("GET /api/papers returns wrapped success response")
    void getPaperList_returns200() throws Exception {
        Page<PaperDto.ListItem> page = new PageImpl<>(List.of(sampleListItem()));
        when(paperService.getPaperList(isNull(), isNull(), any(Pageable.class))).thenReturn(page);

        mockMvc.perform(get("/api/papers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].paperId").value("paper-001"));
    }

    @Test
    @DisplayName("GET /api/papers/{id} returns wrapped detail response")
    void getPaperDetail_found() throws Exception {
        when(paperService.getPaperDetail("paper-001")).thenReturn(sampleDetail());

        mockMvc.perform(get("/api/papers/paper-001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.paperId").value("paper-001"));
    }

    @Test
    @DisplayName("GET /api/papers/{id} returns wrapped error response on not found")
    void getPaperDetail_notFound() throws Exception {
        when(paperService.getPaperDetail("no-paper")).thenThrow(new EntityNotFoundException("not found"));

        mockMvc.perform(get("/api/papers/no-paper"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("COMMON_005"))
                .andExpect(jsonPath("$.error.path").value("/api/papers/no-paper"));
    }
}
