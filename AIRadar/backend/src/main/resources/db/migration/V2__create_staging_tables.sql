-- =============================================================================
-- Gold Upsert용 Staging 테이블
-- GoldServingJob에서 Silver → Staging → Gold(ON CONFLICT) 패턴으로 사용
-- Staging 테이블은 배치마다 TRUNCATE 후 재사용 (영구 보존 불필요)
-- =============================================================================

-- news_items_staging
CREATE TABLE IF NOT EXISTS news_items_staging (
    article_id      VARCHAR(255),
    title           TEXT,
    content         TEXT,
    url             VARCHAR(1000),
    source          VARCHAR(100),
    published_at    VARCHAR(50),        -- Spark에서 문자열로 전달, Upsert 시 CAST
    sentiment       VARCHAR(20),
    keywords        TEXT[],
    score           DECIMAL(5,4),
    summary         TEXT,
    category        VARCHAR(50),
    region          VARCHAR(10),
    error_log       TEXT,
    batch_date      DATE
);

-- papers_staging
CREATE TABLE IF NOT EXISTS papers_staging (
    paper_id        VARCHAR(255),
    title           TEXT,
    abstract        TEXT,
    url             VARCHAR(1000),
    source          VARCHAR(50),
    authors         TEXT[],
    published_at    VARCHAR(50),
    keywords        TEXT[],
    summary         TEXT,
    category        VARCHAR(50),
    research_area   VARCHAR(100),
    error_log       TEXT,
    batch_date      DATE
);

-- github_repos_staging
CREATE TABLE IF NOT EXISTS github_repos_staging (
    repo_id         VARCHAR(255),
    repo_name       VARCHAR(500),
    description     TEXT,
    language        VARCHAR(100),
    topics          TEXT[],
    stars           BIGINT,
    forks           BIGINT,
    open_issues     INT,
    weekly_commits  INT,
    star_delta_7d   INT,
    ai_relevance    BOOLEAN,
    keywords        TEXT[],
    error_log       TEXT,
    batch_date      DATE
);
