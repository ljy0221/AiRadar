package com.mcp.airadar.mail.service;

import com.mcp.airadar.common.api.BusinessException;
import com.mcp.airadar.common.api.ErrorCode;
import com.mcp.airadar.mail.dto.MailSendRequest;
import com.mcp.airadar.mail.dto.MailSendResponse;
import com.mcp.airadar.mail.dto.MailSubscribeRequest;
import com.mcp.airadar.mail.dto.MailSubscriptionResponse;
import com.mcp.airadar.mail.entity.NewsletterSubscription;
import com.mcp.airadar.mail.repository.NewsletterSubscriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
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

    @Transactional(readOnly = true)
    public MailSendResponse sendMockNewsletter(MailSendRequest request) {
        String normalizedEmail = normalizeEmail(request.email());
        String normalizedJobCategory = normalizeJobCategory(request.jobCategory());
        String resolvedJobCategory = normalizedJobCategory != null ? normalizedJobCategory : "AI Practitioner";
        LocalDateTime sentAt = LocalDateTime.now();

        return new MailSendResponse(
                normalizedEmail,
                "[AIRadar] " + resolvedJobCategory + " Daily Brief",
                resolvedJobCategory,
                "Temporary AI industry briefing tailored for " + resolvedJobCategory + ".",
                List.of(
                        "Generative AI job postings increased by 12 percent week over week.",
                        "Interest in GitHub repositories for open-source LLM operations is rising.",
                        "Evaluation automation and cost optimization remain the top adoption themes."
                ),
                sentAt,
                true
        );
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
