package com.mcp.airadar.search.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "content_embeddings")
public class ContentEmbedding {

    @Id
    @Column(name = "content_id", length = 255)
    private String contentId;

    @Column(name = "content_type", length = 20)
    private String contentType;

    // embedding 컬럼(vector(768))은 pgvector 타입으로 JPA 직접 매핑 불가
    // native query로만 사용

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public String getContentId() { return contentId; }
    public String getContentType() { return contentType; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
