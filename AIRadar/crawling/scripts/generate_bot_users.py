#!/usr/bin/env python3
"""
ALS 테스트용 봇 유저 데이터 생성 스크립트

카테고리별 봇 10명이 관심 카테고리 기사를 조회/북마크하는 로그를 생성합니다.
CollaborativeFilteringJob MIN_USERS=3, MIN_ITEMS=5 조건과
recommendation_batch_dag check_min_event_count=100건 조건을 충족시킵니다.

사용법:
    python3 generate_bot_users.py              # 봇 생성 + 로그 생성
    python3 generate_bot_users.py --reset      # 기존 봇 로그 삭제 후 재생성
    python3 generate_bot_users.py --cleanup    # 봇 유저 + 관련 데이터 전체 삭제
    python3 generate_bot_users.py --dry-run    # DB 변경 없이 미리 출력

환경변수:
    POSTGRES_HOST, POSTGRES_PORT, POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD
"""
import argparse
import os
import random
import sys
import uuid
from datetime import datetime, timedelta

import psycopg2
from psycopg2.extras import execute_values

# ---------------------------------------------------------------------------
# DB 설정
# ---------------------------------------------------------------------------
DB_CONFIG = {
    "host":     os.getenv("POSTGRES_HOST", "localhost"),
    "port":     int(os.getenv("POSTGRES_PORT", 15432)),
    "dbname":   os.getenv("POSTGRES_DB", "airadar"),
    "user":     os.getenv("POSTGRES_USER", "airadar"),
    "password": os.getenv("POSTGRES_PASSWORD", ""),
}

BOT_EMAIL_DOMAIN = "bot.airadar.internal"

# ---------------------------------------------------------------------------
# 봇 프로파일 (카테고리 분포 반영: ETC 321, LLM 128, Semiconductor 35 ...)
# view + bookmark 합계 ~146건 → DAG 100건 조건 충족
# ---------------------------------------------------------------------------
BOT_PROFILES = [
    {"name": "bot_llm_heavy",      "categories": ["LLM", "ETC"],               "view": 15, "bookmark": 5},
    {"name": "bot_llm_nlp",        "categories": ["LLM", "NLP"],               "view": 12, "bookmark": 4},
    {"name": "bot_vision_multi",   "categories": ["Vision", "Multimodal"],     "view": 10, "bookmark": 3},
    {"name": "bot_semiconductor",  "categories": ["Semiconductor", "Cloud"],   "view": 10, "bookmark": 3},
    {"name": "bot_robotics_rl",    "categories": ["Robotics", "RL"],           "view":  8, "bookmark": 3},
    {"name": "bot_cloud_etc",      "categories": ["Cloud", "ETC"],             "view": 12, "bookmark": 4},
    {"name": "bot_nlp_researcher", "categories": ["NLP", "LLM"],               "view": 11, "bookmark": 4},
    {"name": "bot_general_1",      "categories": ["LLM", "Cloud", "ETC"],     "view": 12, "bookmark": 4},
    {"name": "bot_general_2",      "categories": ["ETC", "Semiconductor"],     "view": 10, "bookmark": 3},
    {"name": "bot_paper_watcher",  "categories": ["NLP", "Vision", "RL"],     "view": 10, "bookmark": 3},
]


# ---------------------------------------------------------------------------
# 헬퍼
# ---------------------------------------------------------------------------

def get_bot_emails():
    return [f"{p['name']}@{BOT_EMAIL_DOMAIN}" for p in BOT_PROFILES]


def fetch_articles_by_categories(conn, categories: list[str], limit: int) -> list[str]:
    """관심 카테고리 기사를 랜덤으로 조회"""
    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT article_id FROM news_items
            WHERE category = ANY(%s) AND is_active = true
            ORDER BY RANDOM()
            LIMIT %s
            """,
            (categories, limit),
        )
        return [row[0] for row in cur.fetchall()]


def random_occurred_at() -> datetime:
    """최근 29일 내 랜덤 타임스탬프"""
    delta_minutes = random.randint(0, 29 * 24 * 60)
    return datetime.utcnow() - timedelta(minutes=delta_minutes)


# ---------------------------------------------------------------------------
# 주요 작업
# ---------------------------------------------------------------------------

def create_bot_user(conn, profile: dict, dry_run: bool) -> str:
    email = f"{profile['name']}@{BOT_EMAIL_DOMAIN}"
    user_id = str(uuid.uuid4())

    if dry_run:
        print(f"  [DRY-RUN] INSERT users email={email}")
        return user_id

    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO users (id, email, nickname, provider, onboarding_completed, created_at, updated_at)
            VALUES (%s, %s, %s, 'BOT', true, NOW(), NOW())
            ON CONFLICT (email) DO UPDATE SET updated_at = NOW()
            RETURNING id
            """,
            (user_id, email, profile["name"]),
        )
        user_id = str(cur.fetchone()[0])

        # 관심사 등록
        for kw in profile["categories"]:
            cur.execute(
                """
                INSERT INTO user_interests (user_id, keyword, weight, source)
                VALUES (%s, %s, 1.0, 'BOT')
                ON CONFLICT (user_id, keyword) DO NOTHING
                """,
                (user_id, kw),
            )
    conn.commit()
    return user_id


def generate_logs(conn, user_id: str, profile: dict, dry_run: bool) -> int:
    need = profile["view"] + profile["bookmark"]
    articles = fetch_articles_by_categories(conn, profile["categories"], need)

    if not articles:
        print(f"  [{profile['name']}] 기사 없음 — 카테고리: {profile['categories']}")
        return 0

    # 기사가 부족하면 반복 허용
    while len(articles) < need:
        articles += articles
    articles = articles[:need]

    view_articles     = articles[: profile["view"]]
    bookmark_articles = articles[profile["view"] : need]

    logs = []
    for article_id in view_articles:
        logs.append((user_id, article_id, "ARTICLE_VIEWED", random_occurred_at()))
    for article_id in bookmark_articles:
        logs.append((user_id, article_id, "ARTICLE_BOOKMARKED", random_occurred_at()))

    if dry_run:
        print(f"  [DRY-RUN] {profile['name']}: VIEW {len(view_articles)}건, BOOKMARK {len(bookmark_articles)}건")
        return len(logs)

    with conn.cursor() as cur:
        execute_values(
            cur,
            "INSERT INTO search_logs (user_id, article_id, event_type, occurred_at) VALUES %s",
            logs,
        )
    conn.commit()
    return len(logs)


def cleanup_bots(conn, dry_run: bool):
    """봇 유저 및 관련 데이터 전체 삭제"""
    emails = get_bot_emails()

    if dry_run:
        print(f"[DRY-RUN] 삭제 대상 봇 {len(emails)}명:")
        for e in emails:
            print(f"  - {e}")
        return

    with conn.cursor() as cur:
        # 봇 user_id 조회
        cur.execute("SELECT id FROM users WHERE email = ANY(%s)", (emails,))
        bot_ids = [str(row[0]) for row in cur.fetchall()]

        if not bot_ids:
            print("삭제할 봇 유저가 없습니다.")
            return

        cur.execute("DELETE FROM search_logs WHERE user_id = ANY(%s)", (bot_ids,))
        deleted_logs = cur.rowcount

        cur.execute("DELETE FROM user_interests WHERE user_id = ANY(%s)", (bot_ids,))
        deleted_interests = cur.rowcount

        cur.execute("DELETE FROM user_recommendations WHERE user_id = ANY(%s)", (bot_ids,))
        deleted_recs = cur.rowcount

        cur.execute("DELETE FROM users WHERE id = ANY(%s)", (bot_ids,))
        deleted_users = cur.rowcount

    conn.commit()
    print(f"삭제 완료: 유저 {deleted_users}명, 로그 {deleted_logs}건, 관심사 {deleted_interests}건, 추천 {deleted_recs}건")


def reset_logs(conn, dry_run: bool):
    """봇 유저의 기존 로그만 삭제"""
    emails = get_bot_emails()

    with conn.cursor() as cur:
        cur.execute("SELECT id FROM users WHERE email = ANY(%s)", (emails,))
        bot_ids = [str(row[0]) for row in cur.fetchall()]

    if not bot_ids:
        return

    if dry_run:
        print(f"[DRY-RUN] 봇 {len(bot_ids)}명의 기존 로그 삭제 후 재생성")
        return

    with conn.cursor() as cur:
        cur.execute("DELETE FROM search_logs WHERE user_id = ANY(%s)", (bot_ids,))
        print(f"기존 봇 로그 {cur.rowcount}건 삭제")
    conn.commit()


# ---------------------------------------------------------------------------
# 메인
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="ALS 테스트용 봇 유저 데이터 생성")
    parser.add_argument("--reset",   action="store_true", help="기존 봇 로그 삭제 후 재생성")
    parser.add_argument("--cleanup", action="store_true", help="봇 유저 + 관련 데이터 전체 삭제")
    parser.add_argument("--dry-run", action="store_true", help="DB 변경 없이 미리 출력")
    args = parser.parse_args()

    try:
        conn = psycopg2.connect(**DB_CONFIG)
    except Exception as e:
        print(f"DB 연결 실패: {e}", file=sys.stderr)
        sys.exit(1)

    if args.cleanup:
        print("=== 봇 유저 전체 삭제 ===")
        cleanup_bots(conn, args.dry_run)
        conn.close()
        return

    if args.reset:
        print("=== 기존 봇 로그 초기화 ===")
        reset_logs(conn, args.dry_run)

    print(f"=== 봇 유저 생성 시작 (dry_run={args.dry_run}) ===")
    total_logs = 0

    for profile in BOT_PROFILES:
        user_id = create_bot_user(conn, profile, args.dry_run)
        count   = generate_logs(conn, user_id, profile, args.dry_run)
        total_logs += count
        print(f"  [{profile['name']}] user_id={user_id}, 로그 {count}건")

    print(f"\n완료: 봇 {len(BOT_PROFILES)}명, 총 로그 {total_logs}건")
    conn.close()


if __name__ == "__main__":
    main()
