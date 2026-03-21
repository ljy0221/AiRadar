package com.mcp.airadar.mail.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mcp.airadar.common.api.BusinessException;
import com.mcp.airadar.common.api.ErrorCode;
import com.mcp.airadar.mail.dto.MailSubscribeRequest;
import com.mcp.airadar.mail.dto.MailSubscriptionResponse;
import com.mcp.airadar.mail.service.MailService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(MailController.class)
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("test")
@Import({com.mcp.airadar.common.GlobalExceptionHandler.class, com.mcp.airadar.common.api.ApiResponseAdvice.class})
class MailControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private MailService mailService;

    @Test
    @DisplayName("given valid request when subscribe then returns created wrapped response")
    void givenValidRequest_whenSubscribe_thenReturnsCreatedWrappedResponse() throws Exception {
        MailSubscribeRequest request = new MailSubscribeRequest("user@example.com", "프론트엔드");
        MailSubscriptionResponse response = new MailSubscriptionResponse("user@example.com", "프론트엔드", true);

        when(mailService.subscribe(request)).thenReturn(response);

        mockMvc.perform(post("/api/v1/mail")
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.path").value("/api/v1/mail"))
                .andExpect(jsonPath("$.data.email").value("user@example.com"))
                .andExpect(jsonPath("$.data.jobCategory").value("프론트엔드"))
                .andExpect(jsonPath("$.data.subscribed").value(true));
    }

    @Test
    @DisplayName("given valid email and token when unsubscribe then returns no content")
    void givenValidEmailAndToken_whenUnsubscribe_thenReturnsNoContent() throws Exception {
        UUID token = UUID.fromString("c0760e30-fa42-4fbd-83ac-23ee35fd94ab");

        mockMvc.perform(delete("/api/v1/mail")
                        .param("email", "user@example.com")
                        .param("token", token.toString()))
                .andExpect(status().isNoContent());

        verify(mailService).unsubscribe("user@example.com", token);
    }

    @Test
    @DisplayName("given invalid unsubscribe token when unsubscribe then returns wrapped bad request")
    void givenInvalidToken_whenUnsubscribe_thenReturnsWrappedBadRequest() throws Exception {
        UUID token = UUID.fromString("c0760e30-fa42-4fbd-83ac-23ee35fd94ab");
        doThrow(new BusinessException(ErrorCode.INVALID_NEWSLETTER_UNSUBSCRIBE_TOKEN))
                .when(mailService).unsubscribe(eq("user@example.com"), eq(token));

        mockMvc.perform(delete("/api/v1/mail")
                        .param("email", "user@example.com")
                        .param("token", token.toString()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.error.code").value("MAIL_001"));
    }
}
