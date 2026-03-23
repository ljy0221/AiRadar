package com.mcp.airadar.paper.controller;

import com.mcp.airadar.paper.dto.PaperDto;
import com.mcp.airadar.paper.service.PaperService;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.eq;
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
        return PaperDto.ListItem.builder()
                .paperId("paper-001")
                .title("Attention Is All You Need")
                .source("arxiv")
                .authors(new String[]{"Vaswani"})
                .researchArea("cs.CL")
                .category("NLP")
                .publishedAt(LocalDateTime.of(2026, 3, 19, 9, 0))
                .build();
    }

    private PaperDto.DailyGroup sampleDailyGroup() {
        return PaperDto.DailyGroup.builder()
                .date(LocalDate.of(2026, 3, 19))
                .items(List.of(sampleListItem()))
                .build();
    }

    private PaperDto.Detail sampleDetail() {
        return PaperDto.Detail.builder()
                .paperId("paper-001")
                .title("Attention Is All You Need")
                .abstractText("We propose the Transformer...")
                .url("https://arxiv.org/abs/1706.03762")
                .source("arxiv")
                .authors(new String[]{"Vaswani"})
                .researchArea("cs.CL")
                .keywords(new String[]{"transformer", "attention"})
                .summary("summary")
                .category("NLP")
                .publishedAt(LocalDateTime.of(2026, 3, 19, 9, 0))
                .build();
    }

    @Test
    @DisplayName("GET /api/v1/papers returns wrapped success response")
    void getPaperList_returns200() throws Exception {
        when(paperService.getPaperList(isNull(), isNull(), isNull())).thenReturn(List.of(sampleDailyGroup()));

        mockMvc.perform(get("/api/v1/papers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.path").value("/api/v1/papers"))
                .andExpect(jsonPath("$.data[0].date").value("2026-03-19"))
                .andExpect(jsonPath("$.data[0].items[0].paperId").value("paper-001"));
    }

    @Test
    @DisplayName("GET /api/v1/papers with filters returns wrapped grouped response")
    void getPaperList_withFilters_returns200() throws Exception {
        when(paperService.getPaperList(eq("NLP"), eq("cs.CL"), eq(LocalDate.of(2026, 3, 19))))
                .thenReturn(List.of(sampleDailyGroup()));

        mockMvc.perform(get("/api/v1/papers")
                        .param("category", "NLP")
                        .param("researchArea", "cs.CL")
                        .param("date", "2026-03-19"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].items").isArray());
    }

    @Test
    @DisplayName("GET /api/v1/papers/{id} returns wrapped detail response")
    void getPaperDetail_found() throws Exception {
        when(paperService.getPaperDetail("paper-001")).thenReturn(sampleDetail());

        mockMvc.perform(get("/api/v1/papers/paper-001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.paperId").value("paper-001"));
    }

    @Test
    @DisplayName("GET /api/v1/papers/{id} returns wrapped error response on not found")
    void getPaperDetail_notFound() throws Exception {
        when(paperService.getPaperDetail("no-paper")).thenThrow(new EntityNotFoundException("not found"));

        mockMvc.perform(get("/api/v1/papers/no-paper"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("COMMON_005"))
                .andExpect(jsonPath("$.error.path").value("/api/v1/papers/no-paper"));
    }
}
