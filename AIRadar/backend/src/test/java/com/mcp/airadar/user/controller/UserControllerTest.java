package com.mcp.airadar.user.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
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

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.springframework.http.HttpStatus.CONFLICT;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
}
