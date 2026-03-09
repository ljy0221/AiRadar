-- 데이터베이스 기본 테이블 예시

CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY, -- 이벤트 고유 식별자 (자동 증가)
    source VARCHAR(50),    -- 이벤트 출처 (예: github, jira 등)
    title TEXT,            -- 이벤트 제목 (글자 수 제한 없음)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- 이벤트 생성 일시 (기본값: 현재 시간)
);

-- pgvector 확장 및 AI 임베딩 저장 테이블
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS content_embeddings (
    content_id   VARCHAR(255) PRIMARY KEY,
    content_type VARCHAR(20) CHECK (content_type IN ('NEWS', 'PAPER', 'GITHUB')),
    embedding    vector(768),
    created_at   TIMESTAMP DEFAULT NOW(),
    updated_at   TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_embeddings_ivfflat
    ON content_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);