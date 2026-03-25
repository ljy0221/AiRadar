package com.mcp.airadar.dashboard.repository;

import com.mcp.airadar.dashboard.dto.SimilarKeywordDto;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Repository
public class KeywordEmbeddingRepository {

    private final NamedParameterJdbcTemplate jdbcTemplate;

    public KeywordEmbeddingRepository(NamedParameterJdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public Set<String> findExistingKeywords(String sourceType, List<String> keywords) {
        if (keywords.isEmpty()) {
            return Set.of();
        }

        String sql = """
                SELECT keyword
                FROM keyword_embeddings
                WHERE source_type = :sourceType
                  AND keyword IN (:keywords)
                """;

        List<String> found = jdbcTemplate.query(
                sql,
                new MapSqlParameterSource()
                        .addValue("sourceType", sourceType)
                        .addValue("keywords", keywords),
                (rs, rowNum) -> rs.getString("keyword")
        );
        return new HashSet<>(found);
    }

    public void upsert(String sourceType, List<KeywordEmbeddingUpsert> items) {
        if (items.isEmpty()) {
            return;
        }

        String sql = """
                INSERT INTO keyword_embeddings (keyword, source_type, embedding, updated_at)
                VALUES (:keyword, :sourceType, CAST(:embedding AS vector), NOW())
                ON CONFLICT (keyword, source_type)
                DO UPDATE SET
                    embedding = EXCLUDED.embedding,
                    updated_at = NOW()
                """;

        MapSqlParameterSource[] batch = items.stream()
                .map(item -> new MapSqlParameterSource()
                        .addValue("keyword", item.keyword())
                        .addValue("sourceType", sourceType)
                        .addValue("embedding", item.vectorLiteral()))
                .toArray(MapSqlParameterSource[]::new);

        jdbcTemplate.batchUpdate(sql, batch);
    }

    public List<SimilarKeywordDto> findSimilarKeywords(String sourceType, String keyword, int limit, double minSimilarity) {
        String sql = """
                SELECT similar_keyword, similarity
                FROM (
                    SELECT other.keyword AS similar_keyword,
                           1 - (source.embedding <=> other.embedding) AS similarity
                    FROM keyword_embeddings source
                    JOIN keyword_embeddings other
                      ON source.source_type = other.source_type
                     AND source.keyword <> other.keyword
                    WHERE source.source_type = :sourceType
                      AND source.keyword = :keyword
                    ORDER BY source.embedding <=> other.embedding
                    LIMIT :limit
                ) ranked
                WHERE similarity >= :minSimilarity
                ORDER BY similarity DESC, similar_keyword ASC
                """;

        return jdbcTemplate.query(
                sql,
                new MapSqlParameterSource()
                        .addValue("sourceType", sourceType)
                        .addValue("keyword", keyword)
                        .addValue("limit", limit)
                        .addValue("minSimilarity", minSimilarity),
                (rs, rowNum) -> new SimilarKeywordDto(
                        rs.getString("similar_keyword"),
                        rs.getDouble("similarity")
                )
        );
    }

    public record KeywordEmbeddingUpsert(String keyword, String vectorLiteral) {}
}
