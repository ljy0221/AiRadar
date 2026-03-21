package com.mcp.airadar.mail.service;

import com.mcp.airadar.common.api.BusinessException;
import com.mcp.airadar.mail.dto.MailSubscribeRequest;
import com.mcp.airadar.mail.dto.MailSubscriptionResponse;
import com.mcp.airadar.mail.entity.NewsletterSubscription;
import com.mcp.airadar.mail.repository.NewsletterSubscriptionRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MailServiceTest {

    @Mock
    private NewsletterSubscriptionRepository newsletterSubscriptionRepository;

    @InjectMocks
    private MailService mailService;

    @Test
    @DisplayName("given new email when subscribe then creates active subscription")
    void givenNewEmail_whenSubscribe_thenCreatesActiveSubscription() {
        MailSubscribeRequest request = new MailSubscribeRequest("User@Example.com", "프론트엔드");
        NewsletterSubscription saved = NewsletterSubscription.builder()
                .email("user@example.com")
                .jobCategory("프론트엔드")
                .build();

        when(newsletterSubscriptionRepository.findByEmail("user@example.com")).thenReturn(Optional.empty());
        when(newsletterSubscriptionRepository.save(any(NewsletterSubscription.class))).thenReturn(saved);

        MailSubscriptionResponse response = mailService.subscribe(request);

        assertThat(response.email()).isEqualTo("user@example.com");
        assertThat(response.jobCategory()).isEqualTo("프론트엔드");
        assertThat(response.subscribed()).isTrue();
    }

    @Test
    @DisplayName("given existing email when subscribe then reactivates and rotates token")
    void givenExistingEmail_whenSubscribe_thenReactivates() {
        NewsletterSubscription existing = NewsletterSubscription.builder()
                .email("user@example.com")
                .jobCategory("백엔드")
                .build();
        UUID oldToken = existing.getUnsubscribeToken();
        existing.unsubscribe();

        when(newsletterSubscriptionRepository.findByEmail("user@example.com")).thenReturn(Optional.of(existing));

        MailSubscriptionResponse response = mailService.subscribe(new MailSubscribeRequest("user@example.com", "프론트엔드"));

        assertThat(response.subscribed()).isTrue();
        assertThat(response.jobCategory()).isEqualTo("프론트엔드");
        assertThat(existing.getUnsubscribeToken()).isNotEqualTo(oldToken);
        verify(newsletterSubscriptionRepository, never()).save(any());
    }

    @Test
    @DisplayName("given matching email and token when unsubscribe then marks subscription inactive")
    void givenMatchingEmailAndToken_whenUnsubscribe_thenMarksInactive() {
        NewsletterSubscription existing = NewsletterSubscription.builder()
                .email("user@example.com")
                .jobCategory("프론트엔드")
                .build();
        UUID token = existing.getUnsubscribeToken();

        when(newsletterSubscriptionRepository.findByEmailAndUnsubscribeToken("user@example.com", token))
                .thenReturn(Optional.of(existing));

        mailService.unsubscribe("user@example.com", token);

        assertThat(existing.isSubscribed()).isFalse();
    }

    @Test
    @DisplayName("given invalid token when unsubscribe then throws business exception")
    void givenInvalidToken_whenUnsubscribe_thenThrowsBusinessException() {
        UUID token = UUID.randomUUID();
        when(newsletterSubscriptionRepository.findByEmailAndUnsubscribeToken("user@example.com", token))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> mailService.unsubscribe("user@example.com", token))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("이메일 또는 해지 토큰이 올바르지 않습니다.");
    }
}
