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
        GithubOverviewDto dto = new GithubOverviewDto(
                LocalDate.of(2026, 3, 20),
                LocalDate.of(2026, 3, 19),
                7,
                7,
                List.of(new GithubTrendingRepoDto(
                        "mattpocock/skills",
                        "mattpocock/skills",
                        "My personal directory of skills",
                        "TypeScript",
                        10_000L,
                        1_000L,
                        20,
                        500,
                        List.of(new GithubActivityPointDto("03-19", LocalDate.of(2026, 3, 19), 10_000L, 1_000L, 12)),
                        List.of(new GithubActivityPointDto("26-03", LocalDate.of(2026, 3, 19), 10_000L, 1_000L, 12))
                ))
        );

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
                .thenReturn(List.of(new GithubTrendingDto(
                        "mattpocock/skills",
                        "mattpocock/skills",
                        "My personal directory of skills",
                        "TypeScript",
                        10_000L,
                        500,
                        LocalDate.of(2026, 3, 19)
                )));

        // when then
        mockMvc.perform(get("/api/v1/github/trending"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].repoId").value("mattpocock/skills"))
                .andExpect(jsonPath("$.data[0].starDelta1d").value(500));
    }
}
