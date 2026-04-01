package com.mcp.airadar.recommendation.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "user_recommendations",
        indexes = @Index(name = "idx_user_recommendations", columnList = "user_id, score DESC"))
@Getter
@NoArgsConstructor
public class UserRecommendation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "article_id", nullable = false)
    private String articleId;

    @Column(nullable = false, precision = 8, scale = 6)
    private BigDecimal score;

    @Column(length = 50)
    private String reason;

    /** NEWS 또는 PAPER — ALS 추천 결과의 콘텐츠 타입 */
    @Column(name = "content_type", nullable = false, length = 10)
    private String contentType;

    @Column(name = "generated_at", nullable = false)
    private LocalDateTime generatedAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;
}
