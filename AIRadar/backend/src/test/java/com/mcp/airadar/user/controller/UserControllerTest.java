package com.mcp.airadar.user.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mcp.airadar.user.dto.BookmarkHistoryDto;
import com.mcp.airadar.user.dto.LikeHistoryDto;
import com.mcp.airadar.user.dto.OnboardingRequest;
import com.mcp.airadar.user.service.UserService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.http.HttpStatus.CONFLICT;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(UserController.class)
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import({com.mcp.airadar.common.GlobalExceptionHandler.class, com.mcp.airadar.common.api.ApiResponseAdvice.class})
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private UserService userService;

    // ─── POST /api/v1/users/me/onboarding ────────────────────────────────────

    @Test
    @DisplayName("유효한 키워드 목록으로 온보딩 완료 시 200 OK 반환")
    void completeOnboarding_validRequest_returns200() throws Exception {
        OnboardingRequest request = new OnboardingRequest(List.of("AI", "GPU", "HBM"));

        doNothing().when(userService).completeOnboarding(isNull(), any(OnboardingRequest.class));

        mockMvc.perform(post("/api/v1/users/me/onboarding")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("키워드가 빈 배열이면 400 Bad Request 반환")
    void completeOnboarding_emptyKeywords_returns400() throws Exception {
        OnboardingRequest request = new OnboardingRequest(List.of());

        mockMvc.perform(post("/api/v1/users/me/onboarding")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("이미 온보딩 완료된 사용자면 409 Conflict 반환")
    void completeOnboarding_alreadyCompleted_returns409() throws Exception {
        OnboardingRequest request = new OnboardingRequest(List.of("AI"));

        doThrow(new ResponseStatusException(CONFLICT, "이미 온보딩이 완료된 계정입니다."))
                .when(userService).completeOnboarding(isNull(), any(OnboardingRequest.class));

        mockMvc.perform(post("/api/v1/users/me/onboarding")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict());
    }

    // ─── GET /api/v1/users/me/bookmarks ──────────────────────────────────────

    @Test
    @DisplayName("북마크 기록 2건 있을 때 200 OK + 배열 크기 2 반환")
    void getBookmarkHistory_hasTwoItems_returns200WithList() throws Exception {
        LocalDateTime now = LocalDateTime.now();
        List<BookmarkHistoryDto> dtos = List.of(
                new BookmarkHistoryDto("article-001", now.minusHours(2)),
                new BookmarkHistoryDto("article-002", now.minusHours(1))
        );
        when(userService.getBookmarkHistory(isNull())).thenReturn(dtos);

        mockMvc.perform(get("/api/v1/users/me/bookmarks"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(2)))
                .andExpect(jsonPath("$.data[0].articleId", is("article-001")))
                .andExpect(jsonPath("$.data[1].articleId", is("article-002")));
    }

    @Test
    @DisplayName("북마크 기록이 없으면 200 OK + 빈 배열 반환")
    void getBookmarkHistory_noItems_returns200WithEmptyList() throws Exception {
        when(userService.getBookmarkHistory(isNull())).thenReturn(List.of());

        mockMvc.perform(get("/api/v1/users/me/bookmarks"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(0)));
    }

    // ─── GET /api/v1/users/me/likes ──────────────────────────────────────────

    @Test
    @DisplayName("좋아요 기록 1건 있을 때 200 OK + articleId 일치")
    void getLikeHistory_hasOneItem_returns200WithList() throws Exception {
        LocalDateTime now = LocalDateTime.now();
        List<LikeHistoryDto> dtos = List.of(
                new LikeHistoryDto("article-010", now.minusMinutes(30))
        );
        when(userService.getLikeHistory(isNull())).thenReturn(dtos);

        mockMvc.perform(get("/api/v1/users/me/likes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].articleId", is("article-010")));
    }

    @Test
    @DisplayName("좋아요 기록이 없으면 200 OK + 빈 배열 반환")
    void getLikeHistory_noItems_returns200WithEmptyList() throws Exception {
        when(userService.getLikeHistory(isNull())).thenReturn(List.of());

        mockMvc.perform(get("/api/v1/users/me/likes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(0)));
    }
}
