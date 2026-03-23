-- user_recommendations에 content_type 컬럼 추가
-- ALS가 뉴스(NEWS)와 논문(PAPER)을 구분하여 추천 결과를 저장하기 위함
ALTER TABLE user_recommendations
    ADD COLUMN IF NOT EXISTS content_type VARCHAR(10) NOT NULL DEFAULT 'NEWS';

-- user_recommendations_staging에도 동일하게 추가
ALTER TABLE user_recommendations_staging
    ADD COLUMN IF NOT EXISTS content_type VARCHAR(10) NOT NULL DEFAULT 'NEWS';

-- content_type 기반 조회 인덱스
CREATE INDEX IF NOT EXISTS idx_user_rec_user_type
    ON user_recommendations(user_id, content_type, score DESC);
