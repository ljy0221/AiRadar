-- =============================================================================
-- pgvector 확장 설치 및 content_embeddings 전용 테이블 생성
-- 임베딩 모델: paraphrase-multilingual-mpnet-base-v2 (dim=768)
-- 저장 주체: AI 서버(ai-server/)가 분석 후 직접 Upsert
-- news_items / papers / github_repos에는 embedding 컬럼 없음
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS vector;

-- 콘텐츠 임베딩 전용 테이블 (news, paper, github 통합)
CREATE TABLE IF NOT EXISTS content_embeddings (
    content_id   VARCHAR(255) PRIMARY KEY,
    content_type VARCHAR(20)  NOT NULL CHECK (content_type IN ('NEWS', 'PAPER', 'GITHUB')),
    embedding    vector(768)  NOT NULL,
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- 의미 검색용 ivfflat 인덱스 (근사 최근접 이웃, 코사인 거리)
-- lists=100: 데이터 수가 1M 이하일 때 권장값
-- 인덱스는 충분한 데이터가 쌓인 후 빌드해야 효과적 (초기에는 순차 스캔 허용)
CREATE INDEX IF NOT EXISTS idx_content_embeddings_ivfflat
    ON content_embeddings USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
