"""
trend_aggregator.py — 키워드 트렌드 집계 스크립트
=====================================================
역할: news_items, papers, github_repos 테이블에서 키워드별 언급량을 집계하고
      tech_keyword_daily 및 tech_lifecycle 테이블을 갱신합니다.

실행 방법:
  python trend_aggregator.py              # 오늘 날짜 기준 집계
  python trend_aggregator.py --date 2026-03-19  # 특정 날짜 집계

스케줄: Airflow DAG 또는 cron으로 매일 자정 실행 권장
  예: 0 0 * * * python /app/trend_aggregator.py
"""
import argparse
import logging
import os
from datetime import date, timedelta

import psycopg2

# ── 로깅 설정 ────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

# ── 추적할 키워드 사전 (분석가님이 여기서 직접 관리!) ───────────────────────
# key: 대표 키워드 이름 (화면에 표시됨)
# value: DB 검색에 사용할 키워드 배리에이션 목록 (소문자)
TRACKED_KEYWORDS: dict[str, list[str]] = {
    "Agentic Workflow":     ["agentic workflow", "agentic ai", "ai agent", "autogpt", "autonomous agent"],
    "RAG":                  ["rag", "retrieval-augmented", "retrieval augmented", "vector search"],
    "Vision Transformers":  ["vision transformer", "vit", "visual transformer", "image recognition"],
    "Mixture of Experts":   ["mixture of experts", "moe", "mixtral", "sparse expert"],
    "Fine-tuning":          ["fine-tuning", "fine tuning", "finetuning", "lora", "qlora", "peft"],
    "Prompt Engineering":   ["prompt engineering", "prompt design", "in-context learning", "few-shot"],
}

# ── 트렌드 점수 가중치 (합계 = 1.0) ─────────────────────────────────────────
# 분석가님이 이 숫자만 바꾸면 공식이 바뀝니다!
WEIGHT_PAPER     = 0.10  # 논문 언급량 (학계 관심)
WEIGHT_GITHUB    = 0.40  # 깃허브 활성도 → 0으로 바꾸면 제외
WEIGHT_NEWS      = 0.40  # 뉴스 언급량 (대중 관심)
WEIGHT_SENTIMENT = 0.10  # 감성 점수 (긍정적 기조)

# ── 상태 기준 임계치 (데이터 쌓이면 분석가님이 튜닝하세요!) ──────────────────
THRESHOLD_PEAK       = 85.0  # trend_score ≥ 이 값이면 PEAK
THRESHOLD_RISING_WOW = 20.0  # 전주 대비 20% 이상 성장이면 GROWING(RISING)
THRESHOLD_DECLINING  = -15.0 # 전주 대비 -15% 이하 하락이면 DECLINING


# ── DB 연결 (기존 db.py와 동일한 환경변수 사용) ──────────────────────────────
def _get_conn():
    return psycopg2.connect(
        host=os.environ.get("POSTGRES_HOST", "localhost"),
        port=os.environ.get("POSTGRES_PORT", "5432"),
        dbname=os.environ.get("POSTGRES_DB", "airadar"),
        user=os.environ.get("POSTGRES_USER", "airadar"),
        password=os.environ.get("POSTGRES_PASSWORD", "airadar_secret"),
    )


# ── STEP 1. 뉴스 언급량 집계 ─────────────────────────────────────────────────
def _count_news_mentions(cur, keyword_variants: list[str], target_date: date) -> tuple[int, float]:
    """
    주어진 날짜의 news_items에서 키워드 언급 횟수와 평균 감성을 집계합니다.
    keywords 컬럼(TEXT[])에 배리에이션 중 하나라도 포함되어 있으면 카운트합니다.
    """
    placeholders = ", ".join(["%s"] * len(keyword_variants))
    sql = f"""
        SELECT
            COUNT(*)                              AS mention_count,
            COALESCE(AVG(
                CASE sentiment
                    WHEN 'POSITIVE' THEN 1.0
                    WHEN 'NEGATIVE' THEN -1.0
                    ELSE 0.0
                END
            ), 0.0)                               AS avg_sentiment
        FROM news_items
        WHERE is_active = TRUE
          AND DATE(published_at) = %s
          AND EXISTS (
              SELECT 1 FROM unnest(keywords) AS kw
              WHERE lower(kw) = ANY(ARRAY[{placeholders}])
          )
    """
    cur.execute(sql, [target_date] + keyword_variants)
    row = cur.fetchone()
    return int(row[0]), float(row[1])


# ── STEP 2. 논문 언급량 집계 ─────────────────────────────────────────────────
def _count_paper_mentions(cur, keyword_variants: list[str], target_date: date) -> int:
    placeholders = ", ".join(["%s"] * len(keyword_variants))
    sql = f"""
        SELECT COUNT(*)
        FROM papers
        WHERE is_active = TRUE
          AND DATE(published_at) = %s
          AND EXISTS (
              SELECT 1 FROM unnest(keywords) AS kw
              WHERE lower(kw) = ANY(ARRAY[{placeholders}])
          )
    """
    cur.execute(sql, [target_date] + keyword_variants)
    return int(cur.fetchone()[0])


# ── STEP 3. 깃허브 활성도 집계 ──────────────────────────────────────────────
def _count_github_activity(cur, keyword_variants: list[str], target_date: date) -> int:
    """최근 스냅샷에서 키워드 연관 레포들의 star_delta_7d 합계를 집계합니다."""
    placeholders = ", ".join(["%s"] * len(keyword_variants))
    sql = f"""
        SELECT COALESCE(SUM(star_delta_7d), 0)
        FROM github_repos
        WHERE snapshot_date = (
            SELECT MAX(snapshot_date)
            FROM github_repos
            WHERE snapshot_date <= %s
        )
          AND EXISTS (
              SELECT 1 FROM unnest(topics) AS t
              WHERE lower(t) = ANY(ARRAY[{placeholders}])
          )
    """
    cur.execute(sql, [target_date] + keyword_variants)
    return max(0, int(cur.fetchone()[0]))


# ── STEP 4. tech_keyword_daily에 집계 결과 저장 ──────────────────────────────
def _upsert_keyword_daily(cur, keyword: str, target_date: date,
                           source_type: str, mention_count: int,
                           avg_sentiment: float, commit_count: int = 0) -> None:
    sql = """
        INSERT INTO tech_keyword_daily
            (keyword, stat_date, source_type, mention_count, avg_sentiment, commit_count)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT (keyword, stat_date, source_type)
        DO UPDATE SET
            mention_count = EXCLUDED.mention_count,
            avg_sentiment = EXCLUDED.avg_sentiment,
            commit_count  = EXCLUDED.commit_count
    """
    cur.execute(sql, (keyword, target_date, source_type,
                      mention_count, avg_sentiment, commit_count))


# ── STEP 5. 트렌드 점수 계산 공식 ────────────────────────────────────────────
def _calculate_trend_score(paper_mentions: int, github_activity: int,
                             news_mentions: int, avg_sentiment: float) -> float:
    """
    각 소스의 언급량을 정규화(최대 100점 기준)하여 가중 합산합니다.
    정규화 기준값은 데이터가 쌓이면 분석가님이 튜닝하세요!
    """
    MAX_PAPER   = 50    # 논문 하루 50건 이상 → 만점
    MAX_GITHUB  = 5000  # 스타 증가 5000개 이상 → 만점
    MAX_NEWS    = 100   # 뉴스 100건 이상 → 만점

    paper_score     = min(paper_mentions / MAX_PAPER, 1.0) * 100
    github_score    = min(github_activity / MAX_GITHUB, 1.0) * 100
    news_score      = min(news_mentions / MAX_NEWS, 1.0) * 100
    # avg_sentiment는 -1~1 범위 → 0~100 정규화
    sentiment_score = (avg_sentiment + 1.0) / 2.0 * 100

    trend_score = (
        paper_score     * WEIGHT_PAPER +
        github_score    * WEIGHT_GITHUB +
        news_score      * WEIGHT_NEWS +
        sentiment_score * WEIGHT_SENTIMENT
    )
    return round(trend_score, 4)


# ── STEP 6. 전주 대비 성장률 계산 ────────────────────────────────────────────
def _get_last_week_news_count(cur, keyword: str, target_date: date) -> float | None:
    """7일 전 같은 키워드의 뉴스 언급량 조회"""
    week_ago = target_date - timedelta(days=7)
    sql = """
        SELECT mention_count
        FROM tech_keyword_daily
        WHERE keyword = %s
          AND stat_date = %s
          AND source_type = 'NEWS'
    """
    cur.execute(sql, (keyword, week_ago))
    row = cur.fetchone()
    return float(row[0]) if row else None


# ── STEP 7. 상태(Status) 결정 ────────────────────────────────────────────────
def _determine_status(trend_score: float, week_over_week: float,
                       velocity: float) -> str:
    """
    tech_lifecycle 테이블의 CHECK 제약:
    EMERGING | GROWING | PEAK | DECLINING | DORMANT
    """
    if trend_score >= THRESHOLD_PEAK:
        return "PEAK"
    if week_over_week >= THRESHOLD_RISING_WOW and velocity > 0:
        return "GROWING"     # 프론트에서 RISING으로 표시
    if week_over_week <= THRESHOLD_DECLINING:
        return "DECLINING"
    if trend_score < 10.0:
        return "DORMANT"
    return "EMERGING"        # 프론트에서 STABLE로 표시


# ── STEP 8. tech_lifecycle Upsert ────────────────────────────────────────────
def _upsert_lifecycle(cur, keyword: str, trend_score: float,
                       velocity: float, week_over_week: float,
                       status: str, target_date: date) -> None:
    sql = """
        INSERT INTO tech_lifecycle
            (keyword, status, trend_score, velocity, week_over_week, first_seen_date, updated_at)
        VALUES (%s, %s, %s, %s, %s, %s, NOW())
        ON CONFLICT (keyword)
        DO UPDATE SET
            status         = EXCLUDED.status,
            trend_score    = EXCLUDED.trend_score,
            velocity       = EXCLUDED.velocity,
            week_over_week = EXCLUDED.week_over_week,
            peak_date = CASE
                WHEN EXCLUDED.status = 'PEAK' AND tech_lifecycle.peak_date IS NULL
                THEN %s
                ELSE tech_lifecycle.peak_date
            END,
            updated_at     = NOW()
    """
    cur.execute(sql, (keyword, status, trend_score, velocity,
                      week_over_week, target_date, target_date))


# ── 메인 집계 실행 ────────────────────────────────────────────────────────────
def run_aggregation(target_date: date) -> None:
    logger.info(f"🚀 트렌드 집계 시작: {target_date}")

    with _get_conn() as conn, conn.cursor() as cur:
        for keyword, variants in TRACKED_KEYWORDS.items():
            logger.info(f"  📊 처리 중: [{keyword}]")

            # 각 소스별 집계
            news_mentions, avg_sentiment = _count_news_mentions(cur, variants, target_date)
            paper_mentions               = _count_paper_mentions(cur, variants, target_date)
            github_activity              = _count_github_activity(cur, variants, target_date)

            logger.info(
                f"     뉴스: {news_mentions}건 | 논문: {paper_mentions}건 | "
                f"깃허브 ★: +{github_activity} | 감성: {avg_sentiment:.2f}"
            )

            # tech_keyword_daily에 각 소스별로 저장
            _upsert_keyword_daily(cur, keyword, target_date, "NEWS",
                                  news_mentions, avg_sentiment)
            _upsert_keyword_daily(cur, keyword, target_date, "PAPER",
                                  paper_mentions, 0.0)
            _upsert_keyword_daily(cur, keyword, target_date, "GITHUB",
                                  0, 0.0, github_activity)

            # 트렌드 점수 계산
            trend_score = _calculate_trend_score(
                paper_mentions, github_activity, news_mentions, avg_sentiment
            )

            # 전주 동일 날짜 뉴스 언급량으로 velocity / WoW 계산
            last_week_count = _get_last_week_news_count(cur, keyword, target_date)
            if last_week_count is not None and last_week_count > 0:
                week_over_week = round((news_mentions - last_week_count) / last_week_count * 100, 3)
            else:
                week_over_week = 0.0

            velocity = round(
                (paper_mentions + news_mentions - (last_week_count or 0)) * 0.1, 4
            )

            # 상태 결정
            status = _determine_status(trend_score, week_over_week, velocity)

            logger.info(
                f"     trendScore: {trend_score:.1f} | "
                f"WoW: {week_over_week:+.1f}% | 상태: {status}"
            )

            # tech_lifecycle Upsert
            _upsert_lifecycle(cur, keyword, trend_score, velocity,
                              week_over_week, status, target_date)

        conn.commit()

    logger.info(f"✅ 집계 완료: {target_date} ({len(TRACKED_KEYWORDS)}개 키워드)")


# ── 실행 진입점 ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="키워드 트렌드 집계 스크립트")
    parser.add_argument(
        "--date",
        type=lambda s: date.fromisoformat(s),
        default=date.today(),
        help="집계 기준 날짜 (YYYY-MM-DD, 기본값: 오늘)",
    )
    args = parser.parse_args()
    run_aggregation(args.date)
