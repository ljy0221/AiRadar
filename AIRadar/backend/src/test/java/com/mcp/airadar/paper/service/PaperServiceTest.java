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
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaperServiceTest {

    @Mock
    private PaperRepository paperRepository;

    @InjectMocks
    private PaperService paperService;

    private Paper samplePaper;

    @BeforeEach
    void setUp() {
        samplePaper = new Paper();
        ReflectionTestUtils.setField(samplePaper, "paperId", "paper-001");
        ReflectionTestUtils.setField(samplePaper, "title", "Attention Is All You Need");
        ReflectionTestUtils.setField(samplePaper, "source", "arxiv");
        ReflectionTestUtils.setField(samplePaper, "authors", new String[]{"Vaswani"});
        ReflectionTestUtils.setField(samplePaper, "researchArea", "cs.CL");
        ReflectionTestUtils.setField(samplePaper, "category", "NLP");
        ReflectionTestUtils.setField(samplePaper, "publishedAt", LocalDateTime.of(2026, 3, 19, 9, 0));
    }

    @Test
    @DisplayName("given date when get paper list then groups by that date")
    void getPaperList_withDate() {
        LocalDate targetDate = LocalDate.of(2026, 3, 19);
        when(paperRepository.findRecentPaperFeed("NLP", "cs.CL", targetDate.atStartOfDay(), targetDate.plusDays(1).atStartOfDay()))
                .thenReturn(List.of(samplePaper));

        List<PaperDto.DailyGroup> result = paperService.getPaperList("NLP", "cs.CL", targetDate);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).date()).isEqualTo(targetDate);
        assertThat(result.get(0).items()).hasSize(1);
        assertThat(result.get(0).items().get(0).paperId()).isEqualTo("paper-001");
        verify(paperRepository).findRecentPaperFeed("NLP", "cs.CL", targetDate.atStartOfDay(), targetDate.plusDays(1).atStartOfDay());
    }

    @Test
    @DisplayName("given no date when get paper list then returns grouped recent ten days")
    void getPaperList_withoutDate_returnsRecentTenDays() {
        Paper olderPaper = new Paper();
        ReflectionTestUtils.setField(olderPaper, "paperId", "paper-002");
        ReflectionTestUtils.setField(olderPaper, "title", "Older Paper");
        ReflectionTestUtils.setField(olderPaper, "source", "arxiv");
        ReflectionTestUtils.setField(olderPaper, "authors", new String[]{"Author"});
        ReflectionTestUtils.setField(olderPaper, "researchArea", "cs.CL");
        ReflectionTestUtils.setField(olderPaper, "category", "NLP");
        ReflectionTestUtils.setField(olderPaper, "publishedAt", LocalDateTime.of(2026, 3, 18, 8, 0));

        LocalDate today = LocalDate.now();
        when(paperRepository.findRecentPaperFeed(null, null, today.minusDays(9).atStartOfDay(), today.plusDays(1).atStartOfDay()))
                .thenReturn(List.of(olderPaper, samplePaper));

        List<PaperDto.DailyGroup> result = paperService.getPaperList(null, null, null);

        assertThat(result).hasSize(2);
        assertThat(result.get(0).date()).isEqualTo(samplePaper.getPublishedAt().toLocalDate());
        assertThat(result.get(1).date()).isEqualTo(olderPaper.getPublishedAt().toLocalDate());
        verify(paperRepository).findRecentPaperFeed(null, null, today.minusDays(9).atStartOfDay(), today.plusDays(1).atStartOfDay());
        verify(paperRepository, never()).findByIsActiveTrueOrderByPublishedAtDesc(any());
    }

    @Test
    @DisplayName("filters apply to available paper dates response")
    void getAvailableDates() {
        when(paperRepository.findAvailableDates("NLP", "cs.CL"))
                .thenReturn(List.of(LocalDate.of(2026, 3, 19), LocalDate.of(2026, 3, 17)));

        PaperDto.AvailableDates result = paperService.getAvailableDates("NLP", "cs.CL");

        assertThat(result.dates()).containsExactly(LocalDate.of(2026, 3, 19), LocalDate.of(2026, 3, 17));
        assertThat(result.count()).isEqualTo(2);
        assertThat(result.startDate()).isEqualTo(LocalDate.of(2026, 3, 17));
        assertThat(result.endDate()).isEqualTo(LocalDate.of(2026, 3, 19));
        verify(paperRepository).findAvailableDates("NLP", "cs.CL");
    }

    @Test
    @DisplayName("given paper id when get detail then returns paper detail")
    void getPaperDetail_found() {
        when(paperRepository.findByPaperIdAndIsActiveTrue("paper-001")).thenReturn(Optional.of(samplePaper));

        PaperDto.Detail detail = paperService.getPaperDetail("paper-001");

        assertThat(detail).isNotNull();
        assertThat(detail.paperId()).isEqualTo("paper-001");
    }

    @Test
    @DisplayName("given missing paper id when get detail then throws")
    void getPaperDetail_notFound() {
        when(paperRepository.findByPaperIdAndIsActiveTrue("no-paper")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> paperService.getPaperDetail("no-paper"))
                .isInstanceOf(EntityNotFoundException.class)
                .hasMessageContaining("no-paper");
    }
}
