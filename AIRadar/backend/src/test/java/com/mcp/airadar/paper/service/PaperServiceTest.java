package com.mcp.airadar.paper.service;

import com.mcp.airadar.paper.dto.PaperDto;
import com.mcp.airadar.paper.entity.Paper;
import com.mcp.airadar.paper.repository.PaperRepository;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaperServiceTest {

    @Mock
    private PaperRepository paperRepository;

    @InjectMocks
    private PaperService paperService;

    private Pageable pageable;
    private Paper samplePaper;

    @BeforeEach
    void setUp() {
        pageable = PageRequest.of(0, 20);
        samplePaper = new Paper();
    }

    @Test
    @DisplayName("필터 없음 → 전체 조회")
    void getPaperList_noFilter() {
        Page<Paper> page = new PageImpl<>(List.of(samplePaper));
        when(paperRepository.findByIsActiveTrueOrderByPublishedAtDesc(pageable)).thenReturn(page);

        Page<PaperDto.ListItem> result = paperService.getPaperList(null, null, pageable);

        assertThat(result).isNotNull();
        verify(paperRepository).findByIsActiveTrueOrderByPublishedAtDesc(pageable);
        verify(paperRepository, never()).findByIsActiveTrueAndCategoryOrderByPublishedAtDesc(any(), any());
        verify(paperRepository, never()).findByIsActiveTrueAndResearchAreaOrderByPublishedAtDesc(any(), any());
    }

    @Test
    @DisplayName("category만 → category 필터 조회")
    void getPaperList_categoryOnly() {
        Page<Paper> page = new PageImpl<>(List.of(samplePaper));
        when(paperRepository.findByIsActiveTrueAndCategoryOrderByPublishedAtDesc(eq("NLP"), eq(pageable)))
                .thenReturn(page);

        paperService.getPaperList("NLP", null, pageable);

        verify(paperRepository).findByIsActiveTrueAndCategoryOrderByPublishedAtDesc("NLP", pageable);
    }

    @Test
    @DisplayName("researchArea만 → researchArea 필터 조회")
    void getPaperList_researchAreaOnly() {
        Page<Paper> page = new PageImpl<>(List.of(samplePaper));
        when(paperRepository.findByIsActiveTrueAndResearchAreaOrderByPublishedAtDesc(eq("cs.AI"), eq(pageable)))
                .thenReturn(page);

        paperService.getPaperList(null, "cs.AI", pageable);

        verify(paperRepository).findByIsActiveTrueAndResearchAreaOrderByPublishedAtDesc("cs.AI", pageable);
    }

    @Test
    @DisplayName("category + researchArea 둘 다 → 복합 필터 조회")
    void getPaperList_categoryAndResearchArea() {
        Page<Paper> page = new PageImpl<>(List.of(samplePaper));
        when(paperRepository.findByIsActiveTrueAndCategoryAndResearchAreaOrderByPublishedAtDesc(
                eq("Vision"), eq("cs.CV"), eq(pageable))).thenReturn(page);

        paperService.getPaperList("Vision", "cs.CV", pageable);

        verify(paperRepository).findByIsActiveTrueAndCategoryAndResearchAreaOrderByPublishedAtDesc("Vision", "cs.CV", pageable);
    }

    @Test
    @DisplayName("존재하는 paperId → Detail 반환")
    void getPaperDetail_found() {
        when(paperRepository.findByPaperIdAndIsActiveTrue("paper-001")).thenReturn(Optional.of(samplePaper));

        PaperDto.Detail detail = paperService.getPaperDetail("paper-001");

        assertThat(detail).isNotNull();
    }

    @Test
    @DisplayName("없는 paperId → EntityNotFoundException")
    void getPaperDetail_notFound() {
        when(paperRepository.findByPaperIdAndIsActiveTrue("no-paper")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> paperService.getPaperDetail("no-paper"))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessageContaining("no-paper");
    }
}
