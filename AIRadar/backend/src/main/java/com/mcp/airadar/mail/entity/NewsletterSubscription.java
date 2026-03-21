package com.mcp.airadar.mail.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "newsletter_subscriptions")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class NewsletterSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(columnDefinition = "uuid")
    private UUID id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "job_category", length = 100)
    private String jobCategory;

    @Column(name = "unsubscribe_token", nullable = false, unique = true, columnDefinition = "uuid")
    private UUID unsubscribeToken;

    @Column(name = "is_subscribed", nullable = false)
    private boolean subscribed;

    @Column(name = "subscribed_at", nullable = false)
    private LocalDateTime subscribedAt;

    @Column(name = "unsubscribed_at")
    private LocalDateTime unsubscribedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Builder
    public NewsletterSubscription(String email, String jobCategory, UUID unsubscribeToken) {
        this.email = email;
        this.jobCategory = jobCategory;
        this.unsubscribeToken = unsubscribeToken != null ? unsubscribeToken : UUID.randomUUID();
        this.subscribed = true;
    }

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
        if (subscribedAt == null) {
            subscribedAt = now;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public void subscribe(String jobCategory) {
        this.jobCategory = jobCategory;
        this.subscribed = true;
        this.subscribedAt = LocalDateTime.now();
        this.unsubscribedAt = null;
        this.unsubscribeToken = UUID.randomUUID();
        this.updatedAt = LocalDateTime.now();
    }

    public void unsubscribe() {
        this.subscribed = false;
        this.unsubscribedAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }
}
