-- =============================================================================
-- Gold Layer 테이블 초기 생성
-- 데이터 흐름: Bronze (Delta Lake) → Silver (Delta Lake) → Gold (PostgreSQL)
-- Upsert conflict key: article_id / paper_id / repo_id
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. news_items — 뉴스 기사 (AI 분석 결과 포함)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS news_items (
    article_id      VARCHAR(255) PRIMARY KEY,
    title           TEXT NOT NULL,
    content         TEXT,
    url             VARCHAR(1000),
    source          VARCHAR(100),               -- 'TechCrunch', '네이버뉴스' 등
    country_code    CHAR(2),                    -- ISO 3166-1 (KR, US ...)
    region          VARCHAR(10)
                        CHECK (region IN ('DOMESTIC', 'GLOBAL')),

    -- AI 서버 분석 결과 (Silver → Gold)
    sentiment       VARCHAR(20)
                        CHECK (sentiment IN ('POSITIVE', 'NEGATIVE', 'NEUTRAL')),
    keywords        TEXT[],
    score           DECIMAL(5,4),               -- 0.0000 ~ 1.0000
    summary         TEXT,
    category        VARCHAR(50),                -- AI 자동 분류

    -- Feedback Loop 집계 (Spark Streaming)
    view_count      BIGINT DEFAULT 0,

    published_at    TIMESTAMP,
    analyzed_at     TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    is_active       BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_news_published
    ON news_items (published_at DESC) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_news_region
    ON news_items (region, published_at DESC) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_news_country
    ON news_items (country_code, published_at DESC) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_news_keywords
    ON news_items USING GIN (keywords);

-- -----------------------------------------------------------------------------
-- 2. papers — 논문 (arXiv, Hugging Face Papers 등)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS papers (
    paper_id        VARCHAR(255) PRIMARY KEY,   -- arXiv ID 또는 DOI
    title           TEXT NOT NULL,
    abstract        TEXT,
    url             VARCHAR(1000),
    source          VARCHAR(50),                -- 'arxiv' | 'huggingface' | 'semantic_scholar'
    authors         TEXT[],
    research_area   VARCHAR(100),               -- 'cs.AI' | 'cs.LG' 등

    -- AI 서버 분석 결과
    keywords        TEXT[],
    summary         TEXT,
    category        VARCHAR(50),                -- Vision | NLP | RL | Multimodal 등

    published_at    TIMESTAMP,
    analyzed_at     TIMESTAMP,
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW(),
    is_active       BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_papers_published
    ON papers (published_at DESC) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_papers_keywords
    ON papers USING GIN (keywords);
CREATE INDEX IF NOT EXISTS idx_papers_area
    ON papers (research_area, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_papers_category
    ON papers (category, published_at DESC);

-- -----------------------------------------------------------------------------
-- 3. github_repos — GHArchive 저장소 스냅샷
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS github_repos (
    repo_id         VARCHAR(255) PRIMARY KEY,   -- 'owner/repo'
    repo_name       VARCHAR(500) NOT NULL,
    description     TEXT,
    language        VARCHAR(100),
    topics          TEXT[],                     -- GitHub 토픽 태그

    -- 지표
    stars           BIGINT DEFAULT 0,
    forks           BIGINT DEFAULT 0,
    open_issues     INT DEFAULT 0,
    weekly_commits  INT DEFAULT 0,              -- 최근 7일 커밋 수
    star_delta_7d   INT DEFAULT 0,              -- 최근 7일 Star 증감

    -- AI 연관성
    ai_relevance    BOOLEAN DEFAULT FALSE,
    keywords        TEXT[],

    snapshot_date   DATE NOT NULL,              -- 스냅샷 날짜 (Spark 배치 기준)
    created_at      TIMESTAMP DEFAULT NOW(),
    updated_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_github_snapshot
    ON github_repos (snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_github_stars
    ON github_repos (stars DESC, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_github_language
    ON github_repos (language, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_github_topics
    ON github_repos USING GIN (topics);

-- -----------------------------------------------------------------------------
-- 4. tech_contents_view — 뉴스+논문 통합 조회 Materialized View
--    홈/검색에서 UNION 없이 단일 쿼리로 조회 가능
--    REFRESH: Airflow DAG에서 배치 완료 후 트리거
--    명령: REFRESH MATERIALIZED VIEW CONCURRENTLY tech_contents_view;
-- -----------------------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS tech_contents_view AS
    SELECT
        article_id      AS content_id,
        'NEWS'          AS content_type,
        title,
        summary,
        keywords,
        category,
        score,
        published_at,
        source,
        NULL::TEXT[]    AS authors
    FROM news_items
    WHERE is_active = TRUE

    UNION ALL

    SELECT
        paper_id        AS content_id,
        'PAPER'         AS content_type,
        title,
        summary,
        keywords,
        category,
        NULL::DECIMAL   AS score,
        published_at,
        source,
        authors
    FROM papers
    WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_tcv_published
    ON tech_contents_view (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_tcv_type
    ON tech_contents_view (content_type, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_tcv_keywords
    ON tech_contents_view USING GIN (keywords);

-- -----------------------------------------------------------------------------
-- 5. tech_keyword_daily — 날짜별 키워드 빈도 집계
--    mention_count: 콘텐츠 내 언급 횟수 (전문가 트렌드)
--    search_count:  사용자 검색/클릭 횟수 (대중 트렌드)
--    → "전문가 트렌드 vs 대중 트렌드" 비교 시각화에 활용
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tech_keyword_daily (
    id              BIGSERIAL PRIMARY KEY,
    keyword         VARCHAR(200) NOT NULL,
    stat_date       DATE NOT NULL,
    source_type     VARCHAR(20)
                        CHECK (source_type IN ('NEWS', 'PAPER', 'GITHUB')),

    mention_count   INT DEFAULT 0,
    search_count    INT DEFAULT 0,
    avg_sentiment   DECIMAL(4,3),               -- -1.000 ~ 1.000
    commit_count    INT DEFAULT 0,              -- GHArchive 연관 커밋 수

    created_at      TIMESTAMP DEFAULT NOW(),
    UNIQUE (keyword, stat_date, source_type)
);

CREATE INDEX IF NOT EXISTS idx_kwd_daily_keyword
    ON tech_keyword_daily (keyword, stat_date DESC);
CREATE INDEX IF NOT EXISTS idx_kwd_daily_date
    ON tech_keyword_daily (stat_date DESC);

-- -----------------------------------------------------------------------------
-- 6. tech_lifecycle — 기술 키워드 수명주기 상태
--    trend_score: 현재 높이 (절댓값)
--    velocity:    변화 가속도 (trend_score - 전주 trend_score)
--                 양수=가속 상승, 음수=감속/하락
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tech_lifecycle (
    keyword             VARCHAR(200) PRIMARY KEY,
    status              VARCHAR(20)
                            CHECK (status IN ('EMERGING', 'GROWING', 'PEAK', 'DECLINING', 'DORMANT')),
    peak_date           DATE,
    first_seen_date     DATE,
    trend_score         DECIMAL(8,4),
    velocity            DECIMAL(8,4),
    week_over_week      DECIMAL(6,3),           -- 전주 대비 변화율 (%)
    related_keywords    TEXT[],

    updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lifecycle_status
    ON tech_lifecycle (status, trend_score DESC);
CREATE INDEX IF NOT EXISTS idx_lifecycle_velocity
    ON tech_lifecycle (velocity DESC);          -- "이번 주 급상승" 쿼리용

-- -----------------------------------------------------------------------------
-- 7. tech_commercialization — 연구→상용화 타임라인
--    논문 최초 등장일부터 제품 뉴스 감지일까지 days_to_market 추적
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tech_commercialization (
    tech_name               VARCHAR(200) PRIMARY KEY,
    category                VARCHAR(50),

    first_paper_date        DATE,               -- 최초 논문 게재일
    paper_peak_date         DATE,               -- 논문 발표 피크 시점
    paper_count             INT DEFAULT 0,

    first_product_date      DATE,               -- 최초 제품/서비스 뉴스 감지일
    product_count           INT DEFAULT 0,

    days_to_market          INT,                -- first_paper_date → first_product_date
    commercialization_stage VARCHAR(30)
                                CHECK (commercialization_stage IN ('RESEARCH', 'EARLY_ADOPTION', 'MAINSTREAM')),

    updated_at              TIMESTAMP DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 8. job_ai_risk — 직업군별 AI 대체 리스크
--    scenarios: JSONB → AI가 생성한 유연한 시나리오 저장 (스키마 변경 없이 확장 가능)
--    예: [{"tech":"RAG","usecase":"고객 FAQ 자동화","impact":"HIGH"}]
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS job_ai_risk (
    job_type                VARCHAR(200) PRIMARY KEY,
    job_category            VARCHAR(100),       -- '개발', '마케팅', '디자인' 등
    risk_level              VARCHAR(10)
                                CHECK (risk_level IN ('HIGH', 'MEDIUM', 'LOW')),
    risk_score              DECIMAL(4,2),       -- 0.00 ~ 10.00

    human_strengths         TEXT[],             -- AI가 못 하는 인간 고유 역량
    recommended_skills      TEXT[],             -- 차별화 스킬 추천
    scenarios               JSONB,
    related_tools           TEXT[],             -- 유망 AI 툴
    source_article_count    INT DEFAULT 0,

    updated_at              TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_risk_level
    ON job_ai_risk (risk_level, risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_job_category
    ON job_ai_risk (job_category);

-- -----------------------------------------------------------------------------
-- 9. country_ai_stats — 국가별 AI 활동 지표 (190개국 지도 시각화용)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS country_ai_stats (
    id                      BIGSERIAL PRIMARY KEY,
    country_code            CHAR(2) NOT NULL,   -- ISO 3166-1
    country_name            VARCHAR(100),
    stat_date               DATE NOT NULL,

    news_volume             INT DEFAULT 0,
    avg_sentiment           DECIMAL(4,3),
    github_contributions    INT DEFAULT 0,
    ai_activity_score       DECIMAL(6,3),

    created_at              TIMESTAMP DEFAULT NOW(),
    UNIQUE (country_code, stat_date)
);

CREATE INDEX IF NOT EXISTS idx_country_date
    ON country_ai_stats (stat_date DESC, ai_activity_score DESC);
CREATE INDEX IF NOT EXISTS idx_country_code
    ON country_ai_stats (country_code, stat_date DESC);
