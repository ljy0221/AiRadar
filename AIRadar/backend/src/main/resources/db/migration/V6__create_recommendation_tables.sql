-- search_logs: Kafka의 Delta Lake 역할 대체 — Spark 배치가 직접 읽는 이벤트 로그
-- 월별 파티셔닝 (데이터 증가 대비)
CREATE TABLE search_logs (
    id          BIGSERIAL,
    user_id     UUID,
    article_id  VARCHAR(255),
    query       VARCHAR(500),
    event_type  VARCHAR(30) NOT NULL,
    occurred_at TIMESTAMP NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (occurred_at);

CREATE TABLE search_logs_2025_03 PARTITION OF search_logs
    FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');
CREATE TABLE search_logs_2025_04 PARTITION OF search_logs
    FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');
CREATE TABLE search_logs_2025_05 PARTITION OF search_logs
    FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');
CREATE TABLE search_logs_2025_06 PARTITION OF search_logs
    FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');
CREATE TABLE search_logs_2026_01 PARTITION OF search_logs
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE search_logs_2026_02 PARTITION OF search_logs
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
CREATE TABLE search_logs_2026_03 PARTITION OF search_logs
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
CREATE TABLE search_logs_2026_04 PARTITION OF search_logs
    FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

CREATE INDEX idx_search_logs_user_time  ON search_logs(user_id, occurred_at DESC)
    WHERE user_id IS NOT NULL;
CREATE INDEX idx_search_logs_event_time ON search_logs(event_type, occurred_at DESC);

-- user_interests: 수동 설정 또는 행동 기반 추론된 관심 키워드
CREATE TABLE user_interests (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL,
    keyword    VARCHAR(100) NOT NULL,
    weight     DECIMAL(8, 4) NOT NULL DEFAULT 1.0,
    source     VARCHAR(20) NOT NULL DEFAULT 'MANUAL',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, keyword)
);

CREATE INDEX idx_user_interests_user ON user_interests(user_id, weight DESC);

-- user_recommendations: Spark ALS 배치 결과 저장
CREATE TABLE user_recommendations (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL,
    article_id   VARCHAR(255) NOT NULL,
    score        DECIMAL(8, 6) NOT NULL,
    reason       VARCHAR(50),
    generated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at   TIMESTAMP NOT NULL DEFAULT (NOW() + INTERVAL '1 day')
);

CREATE INDEX idx_user_recommendations ON user_recommendations(user_id, score DESC);
CREATE INDEX idx_user_recommendations_expires ON user_recommendations(expires_at);
