package com.mcp.airadar.mail.service;

import com.mcp.airadar.common.api.BusinessException;
import com.mcp.airadar.common.api.ErrorCode;
import com.mcp.airadar.mail.dto.MailSubscribeRequest;
import com.mcp.airadar.mail.dto.MailSubscriptionResponse;
import com.mcp.airadar.mail.entity.NewsletterSubscription;
import com.mcp.airadar.mail.repository.NewsletterSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MailService {

    private final NewsletterSubscriptionRepository newsletterSubscriptionRepository;

    @Transactional
    public MailSubscriptionResponse subscribe(MailSubscribeRequest request) {
        String normalizedEmail = normalizeEmail(request.email());
        String normalizedJobCategory = normalizeJobCategory(request.jobCategory());

        NewsletterSubscription subscription = newsletterSubscriptionRepository.findByEmail(normalizedEmail)
                .map(existing -> {
                    existing.subscribe(normalizedJobCategory);
                    return existing;
                })
                .orElseGet(() -> newsletterSubscriptionRepository.save(NewsletterSubscription.builder()
                        .email(normalizedEmail)
                        .jobCategory(normalizedJobCategory)
                        .build()));

        return new MailSubscriptionResponse(
                subscription.getEmail(),
                subscription.getJobCategory(),
                subscription.isSubscribed()
        );
    }

    @Transactional
    public void unsubscribe(String email, UUID token) {
        String normalizedEmail = normalizeEmail(email);

        NewsletterSubscription subscription = newsletterSubscriptionRepository
                .findByEmailAndUnsubscribeToken(normalizedEmail, token)
                .orElseThrow(() -> new BusinessException(
                        ErrorCode.INVALID_NEWSLETTER_UNSUBSCRIBE_TOKEN,
                        "이메일 또는 해지 토큰이 올바르지 않습니다."
                ));

        if (subscription.isSubscribed()) {
            subscription.unsubscribe();
        }
    }

    private String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeJobCategory(String jobCategory) {
        if (jobCategory == null) {
            return null;
        }

        String trimmed = jobCategory.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
