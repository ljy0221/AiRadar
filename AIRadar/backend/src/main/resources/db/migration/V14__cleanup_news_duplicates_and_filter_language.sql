-- =============================================================================
-- V14: news_items 중복 제거 및 비한/영어 기사 비활성화
-- =============================================================================
-- 1. 언어 감지 헬퍼 함수
--    title + content의 문자를 분석해 한국어/영어 비율 판단
--    한국어: 유니코드 AC00-D7A3 (가-힣)
--    영어:   ASCII A-Z, a-z
--    알파벳+한글 문자 중 한/영 비율이 10% 미만이면 비한/영어로 분류
-- =============================================================================

CREATE OR REPLACE FUNCTION is_korean_or_english(text_input TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    total_alpha  INT;
    ko_en_count  INT;
BEGIN
    IF text_input IS NULL OR length(text_input) = 0 THEN
        RETURN TRUE; -- NULL/빈 문자열은 필터링하지 않음
    END IF;

    -- 알파벳 계열 전체 문자 수 (한글 + 라틴 + 기타 알파벳)
    total_alpha := length(regexp_replace(text_input, '[^[:alpha:]\u1100-\u11FF\uAC00-\uD7A3]', '', 'g'));

    -- 한국어(가-힣) + 영어(A-Z, a-z) 문자 수
    ko_en_count := length(regexp_replace(text_input, '[^A-Za-z\uAC00-\uD7A3]', '', 'g'));

    -- 알파벳 문자가 거의 없으면 (숫자/기호만) 필터링하지 않음
    IF total_alpha < 10 THEN
        RETURN TRUE;
    END IF;

    -- 한/영 비율이 30% 이상이면 한국어 또는 영어 기사로 판단
    RETURN (ko_en_count::FLOAT / total_alpha) >= 0.30;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================================================
-- 2. 중복 기사 비활성화
--    같은 url을 가진 기사 중 가장 오래된(created_at 기준) 것만 유지
--    article_id가 PRIMARY KEY이므로 url 기반 중복만 처리
-- =============================================================================

UPDATE news_items
SET is_active = FALSE,
    updated_at = NOW()
WHERE article_id IN (
    SELECT article_id
    FROM (
        SELECT
            article_id,
            ROW_NUMBER() OVER (
                PARTITION BY url
                ORDER BY created_at ASC, article_id ASC
            ) AS rn
        FROM news_items
        WHERE url IS NOT NULL
          AND url != ''
          AND is_active = TRUE
    ) ranked
    WHERE rn > 1
);

-- =============================================================================
-- 3. 비한/영어 기사 비활성화
--    title 기준으로 1차 판단, title이 짧으면 content도 함께 판단
-- =============================================================================

UPDATE news_items
SET is_active = FALSE,
    updated_at = NOW()
WHERE is_active = TRUE
  AND NOT is_korean_or_english(
      COALESCE(title, '') || ' ' || COALESCE(LEFT(content, 200), '')
  );

-- =============================================================================
-- 4. 결과 로깅 (마이그레이션 실행 시 확인용)
-- =============================================================================

DO $$
DECLARE
    active_count   INT;
    inactive_count INT;
BEGIN
    SELECT COUNT(*) INTO active_count   FROM news_items WHERE is_active = TRUE;
    SELECT COUNT(*) INTO inactive_count FROM news_items WHERE is_active = FALSE;
    RAISE NOTICE 'V14 완료 — 활성: %건, 비활성(중복+비한영): %건', active_count, inactive_count;
END $$;
