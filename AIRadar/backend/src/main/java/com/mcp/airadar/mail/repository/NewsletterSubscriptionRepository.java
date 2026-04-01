package com.mcp.airadar.mail.repository;

import com.mcp.airadar.mail.entity.NewsletterSubscription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface NewsletterSubscriptionRepository extends JpaRepository<NewsletterSubscription, UUID> {
    Optional<NewsletterSubscription> findByEmail(String email);

    Optional<NewsletterSubscription> findByEmailAndUnsubscribeToken(String email, UUID unsubscribeToken);
}
