-- =============================================================================
-- 기업별 뉴스 타임라인 저장
-- news_items_staging에 companies 컬럼 추가 + company_news_timeline 테이블 생성
-- GoldServingJob이 Silver의 companies 배열을 unnest해서 타임라인에 Upsert
-- =============================================================================

-- news_items_staging에 companies 컬럼 추가 (Spark JDBC writeToStaging 대상)
ALTER TABLE news_items_staging ADD COLUMN IF NOT EXISTS companies TEXT[];

-- 기업별 뉴스 타임라인 전용 테이블
-- article_id에 FK 미적용 — Upsert 순서 무관, 파이프라인 유연성 유지
CREATE TABLE IF NOT EXISTS company_news_timeline (
    id            BIGSERIAL PRIMARY KEY,
    company_name  VARCHAR(200) NOT NULL,
    article_id    VARCHAR(255) NOT NULL,
    published_at  TIMESTAMP,
    UNIQUE (company_name, article_id)
);

CREATE INDEX IF NOT EXISTS idx_cnt_company
    ON company_news_timeline (company_name, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_cnt_article
    ON company_news_timeline (article_id);
