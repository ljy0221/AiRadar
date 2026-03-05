-- 데이터베이스 기본 테이블 예시

CREATE TABLE IF NOT EXISTS events (
    id SERIAL PRIMARY KEY, -- 이벤트 고유 식별자 (자동 증가)
    source VARCHAR(50),    -- 이벤트 출처 (예: github, jira 등)
    title TEXT,            -- 이벤트 제목 (글자 수 제한 없음)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- 이벤트 생성 일시 (기본값: 현재 시간)
);