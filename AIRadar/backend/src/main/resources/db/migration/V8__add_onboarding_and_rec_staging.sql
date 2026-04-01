-- 온보딩 완료 여부 컬럼 추가
ALTER TABLE users ADD COLUMN onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE;

-- ALS 배치 추천 Upsert용 Staging 테이블
CREATE TABLE user_recommendations_staging (LIKE user_recommendations INCLUDING ALL);
