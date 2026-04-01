CREATE TABLE IF NOT EXISTS keyword_embeddings (
    keyword     VARCHAR(200) NOT NULL,
    source_type VARCHAR(20)  NOT NULL CHECK (source_type IN ('NEWS', 'PAPER', 'GITHUB')),
    embedding   vector(768)  NOT NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    PRIMARY KEY (keyword, source_type)
);

CREATE INDEX IF NOT EXISTS idx_keyword_embeddings_ivfflat
    ON keyword_embeddings USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
