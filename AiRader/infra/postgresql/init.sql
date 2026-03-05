-- 데이터베이스 기본 테이블 예시

CREATE TABLE IF NOT EXISTS events (
                                      id SERIAL PRIMARY KEY,
                                      source VARCHAR(50),
    title TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );