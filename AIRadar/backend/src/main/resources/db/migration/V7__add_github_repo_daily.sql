-- github_repo_daily: 날짜별 레포 이력 (star 급증 감지용)
CREATE TABLE github_repo_daily (
    id             BIGSERIAL    PRIMARY KEY,
    repo_id        VARCHAR(255) NOT NULL,
    snapshot_date  DATE         NOT NULL,
    stars          BIGINT,
    forks          BIGINT,
    open_issues    INT,
    weekly_commits INT,
    star_delta_1d  INT,          -- 전날 대비 star 증가량 (첫날 수집 시 NULL)
    created_at     TIMESTAMP DEFAULT NOW(),
    UNIQUE (repo_id, snapshot_date)
);

CREATE INDEX idx_github_repo_daily_date  ON github_repo_daily (snapshot_date);
CREATE INDEX idx_github_repo_daily_delta ON github_repo_daily (star_delta_1d DESC);

-- staging 테이블 (Gold Upsert 패턴 일관성 유지)
CREATE TABLE github_repo_daily_staging (
    repo_id        VARCHAR(255),
    snapshot_date  DATE,
    stars          BIGINT,
    forks          BIGINT,
    open_issues    INT,
    weekly_commits INT,
    star_delta_1d  INT
);
