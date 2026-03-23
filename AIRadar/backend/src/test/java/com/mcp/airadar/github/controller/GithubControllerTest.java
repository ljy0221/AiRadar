package com.mcp.airadar.github.controller;

import com.mcp.airadar.github.dto.GithubActivityPointDto;
import com.mcp.airadar.github.dto.GithubOverviewDto;
import com.mcp.airadar.github.dto.GithubTrendingDto;
import com.mcp.airadar.github.dto.GithubTrendingRepoDto;
import com.mcp.airadar.github.service.GithubService;
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
import java.util.List;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(GithubController.class)
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import(com.mcp.airadar.common.api.ApiResponseAdvice.class)
class GithubControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private GithubService githubService;

    @Test
    @DisplayName("given query params when get github overview then returns wrapped response")
    void givenQueryParams_whenGetGithubOverview_thenReturnsWrappedResponse() throws Exception {
        // given
        GithubOverviewDto dto = GithubOverviewDto.builder()
                .requestedDate(LocalDate.of(2026, 3, 20))
                .snapshotDate(LocalDate.of(2026, 3, 19))
                .dailyWindow(7)
                .monthlyWindow(7)
                .repos(List.of(GithubTrendingRepoDto.builder()
                        .repoId("mattpocock/skills")
                        .repoName("mattpocock/skills")
                        .description("My personal directory of skills")
                        .language("TypeScript")
                        .stars(10_000L)
                        .forks(1_000L)
                        .starDelta7d(500)
                        .daily(List.of(GithubActivityPointDto.builder()
                                .label("03-19")
                                .snapshotDate(LocalDate.of(2026, 3, 19))
                                .stars(10_000L)
                                .forks(1_000L)
                                .openIssues(12)
                                .build()))
                        .monthly(List.of(GithubActivityPointDto.builder()
                                .label("26-03")
                                .snapshotDate(LocalDate.of(2026, 3, 19))
                                .stars(10_000L)
                                .forks(1_000L)
                                .openIssues(12)
                                .build()))
                        .build()))
                .build();

        when(githubService.getGithubOverview(eq(LocalDate.of(2026, 3, 20)), eq(3), eq(7), eq(7))).thenReturn(dto);

        // when then
        mockMvc.perform(get("/api/v1/github")
                        .param("date", "2026-03-20")
                        .param("limit", "3")
                        .param("dailyWindow", "7")
                        .param("monthlyWindow", "7"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.path").value("/api/v1/github"))
                .andExpect(jsonPath("$.data.snapshotDate").value("2026-03-19"))
                .andExpect(jsonPath("$.data.repos[0].repoId").value("mattpocock/skills"))
                .andExpect(jsonPath("$.data.repos[0].daily[0].label").value("03-19"));
    }

    @Test
    @DisplayName("given default params when get github trending then returns wrapped list response")
    void givenDefaultParams_whenGetGithubTrending_thenReturnsWrappedListResponse() throws Exception {
        // given
        when(githubService.getTrendingRepos(isNull(), eq(10)))
                .thenReturn(List.of(GithubTrendingDto.builder()
                        .repoId("mattpocock/skills")
                        .repoName("mattpocock/skills")
                        .description("My personal directory of skills")
                        .language("TypeScript")
                        .stars(10_000L)
                        .starDelta1d(500)
                        .snapshotDate(LocalDate.of(2026, 3, 19))
                        .build()));

        // when then
        mockMvc.perform(get("/api/v1/github/trending"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].repoId").value("mattpocock/skills"))
                .andExpect(jsonPath("$.data[0].starDelta1d").value(500));
    }
}
