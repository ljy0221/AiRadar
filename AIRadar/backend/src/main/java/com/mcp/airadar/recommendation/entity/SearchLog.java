package com.mcp.airadar.recommendation.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Kafka Delta Lake 역할 대체 — Spark 배치 협업 필터링 입력 데이터
 * 파티셔닝 테이블이므로 JPA GeneratedValue 없이 DB 기본값 사용
 */
@Entity
@Table(name = "search_logs")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class SearchLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private UUID userId;

    @Column(name = "article_id")
    private String articleId;

    @Column(name = "query")
    private String query;

    @Column(name = "event_type", nullable = false, length = 30)
    private String eventType;

    @Column(name = "occurred_at", nullable = false)
    private LocalDateTime occurredAt;

    @Builder
    public SearchLog(UUID userId, String articleId, String query,
                     String eventType, LocalDateTime occurredAt) {
        this.userId = userId;
        this.articleId = articleId;
        this.query = query;
        this.eventType = eventType;
        this.occurredAt = occurredAt != null ? occurredAt : LocalDateTime.now();
    }
}
