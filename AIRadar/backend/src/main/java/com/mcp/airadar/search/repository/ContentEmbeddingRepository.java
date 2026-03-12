package com.mcp.airadar.search.repository;

import com.mcp.airadar.search.entity.ContentEmbedding;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ContentEmbeddingRepository extends JpaRepository<ContentEmbedding, String> {

    /**
     * pgvector cosine 유사도 검색 (embedding 벡터는 AI 서버가 직접 저장)
     * query_embedding은 호출 시점에 AI 서버에서 생성된 float[] → PostgreSQL array literal로 변환 필요
     */
    @Query(value = """
            SELECT content_id, content_type,
                   1 - (embedding <=> CAST(:queryEmbedding AS vector)) AS similarity
            FROM content_embeddings
            ORDER BY embedding <=> CAST(:queryEmbedding AS vector)
            LIMIT :limit
            """, nativeQuery = true)
    List<Object[]> findSimilar(@Param("queryEmbedding") String queryEmbedding,
                               @Param("limit") int limit);
}
