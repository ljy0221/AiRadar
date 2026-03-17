#!/usr/bin/env python3
"""
파이프라인 단계별 건수 검증 스크립트

Bronze(MinIO) → Silver(MinIO) → Gold(PostgreSQL) 각 단계의 데이터 건수를 확인하여
파이프라인이 정상 동작하는지 검증한다.

사용법:
    python scripts/verify_pipeline.py
    python scripts/verify_pipeline.py --date 2025-03-17
    python scripts/verify_pipeline.py --date 2025-03-17 --pg-url postgresql://user:pw@localhost:5432/airadar
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import urllib.request
import urllib.parse
from base64 import b64encode
from datetime import datetime, timezone


# ---------------------------------------------------------------------------
# 환경변수
# ---------------------------------------------------------------------------
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "http://localhost:9000")
MINIO_ACCESS_KEY = os.getenv("AWS_ACCESS_KEY_ID", "minioadmin")
MINIO_SECRET_KEY = os.getenv("AWS_SECRET_ACCESS_KEY", "minioadmin123")
MINIO_BUCKET = "airader"

POSTGRES_JDBC_URL = os.getenv("POSTGRES_JDBC_URL", "")
POSTGRES_URL = os.getenv("POSTGRES_URL", "")           # postgresql://user:pw@host:port/db 형식
POSTGRES_USER = os.getenv("POSTGRES_USER", "")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
POSTGRES_DB = os.getenv("POSTGRES_DB", "airadar")

BRONZE_BASE_PATH = os.getenv("BRONZE_BASE_PATH", "bronze")
SILVER_BASE_PATH = os.getenv("SILVER_BASE_PATH", "silver")

SOURCE_TYPES = ["news", "paper", "github"]


# ---------------------------------------------------------------------------
# MinIO: 객체 목록으로 파일 존재 여부 확인
# ---------------------------------------------------------------------------
def _minio_list_objects(prefix: str) -> list[dict]:
    """MinIO S3 ListObjectsV2 API 호출 — 인증 없이 시도 후 Basic 인증 시도"""
    endpoint = MINIO_ENDPOINT.rstrip("/")
    url = f"{endpoint}/{MINIO_BUCKET}?list-type=2&prefix={urllib.parse.quote(prefix)}&max-keys=1000"

    credentials = b64encode(f"{MINIO_ACCESS_KEY}:{MINIO_SECRET_KEY}".encode()).decode()
    req = urllib.request.Request(url, headers={"Authorization": f"Basic {credentials}"})

    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            body = resp.read().decode("utf-8")
            # 파일 개수: <Key> 태그 count
            count = body.count("<Key>")
            return [{"count": count, "raw": body[:200]}]
    except Exception as exc:
        return [{"error": str(exc)}]


def count_bronze_objects(date: str, source_type: str) -> int | str:
    """Bronze Delta Lake 파티션 파일 수 반환 (파일 수 ≠ 레코드 수이지만 존재 여부 확인용)"""
    prefix = f"{BRONZE_BASE_PATH}/{source_type}/date={date}/"
    result = _minio_list_objects(prefix)
    if result and "error" in result[0]:
        return f"ERROR: {result[0]['error']}"
    count = result[0].get("count", 0) if result else 0
    return count


def count_silver_objects(source_type: str) -> int | str:
    """Silver Delta Lake 파일 수 반환"""
    prefix = f"{SILVER_BASE_PATH}/{source_type}/"
    result = _minio_list_objects(prefix)
    if result and "error" in result[0]:
        return f"ERROR: {result[0]['error']}"
    count = result[0].get("count", 0) if result else 0
    return count


# ---------------------------------------------------------------------------
# PostgreSQL: psycopg2로 건수 조회
# ---------------------------------------------------------------------------
def _get_pg_conn(pg_url: str | None):
    try:
        import psycopg2
    except ImportError:
        return None, "psycopg2 미설치 (pip install psycopg2-binary)"

    try:
        if pg_url:
            conn = psycopg2.connect(pg_url)
        elif POSTGRES_URL:
            conn = psycopg2.connect(POSTGRES_URL)
        elif POSTGRES_USER and POSTGRES_PASSWORD:
            conn = psycopg2.connect(
                host=POSTGRES_HOST,
                port=int(POSTGRES_PORT),
                dbname=POSTGRES_DB,
                user=POSTGRES_USER,
                password=POSTGRES_PASSWORD,
            )
        else:
            return None, "PostgreSQL 연결 정보 없음 (POSTGRES_URL 또는 POSTGRES_USER/PASSWORD 환경변수 설정 필요)"
        return conn, None
    except Exception as exc:
        return None, str(exc)


def count_gold_rows(date: str, pg_url: str | None = None) -> dict[str, int | str]:
    conn, err = _get_pg_conn(pg_url)
    if err:
        return {t: f"DB 연결 실패: {err}" for t in ["news_items", "papers", "github_repos"]}

    results = {}
    queries = {
        "news_items": f"SELECT COUNT(*) FROM news_items WHERE DATE(analyzed_at) = '{date}'",
        "papers":     f"SELECT COUNT(*) FROM papers WHERE DATE(analyzed_at) = '{date}'",
        "github_repos": f"SELECT COUNT(*) FROM github_repos WHERE snapshot_date = '{date}'",
    }

    try:
        cur = conn.cursor()
        for table, sql in queries.items():
            try:
                cur.execute(sql)
                results[table] = cur.fetchone()[0]
            except Exception as exc:
                results[table] = f"쿼리 실패: {exc}"
                conn.rollback()
        cur.close()
    finally:
        conn.close()

    return results


def count_silver_error_ratio(date: str, pg_url: str | None = None) -> dict[str, str]:
    """Silver error_log 비율 확인 — Gold DB에서 간접 확인"""
    conn, err = _get_pg_conn(pg_url)
    if err:
        return {"error": err}

    results = {}
    try:
        cur = conn.cursor()
        # Gold news_items에서 analyzed_at 기반 (Silver error_log IS NULL 통과한 것들)
        cur.execute(f"""
            SELECT COUNT(*) as total, COUNT(summary) as with_summary
            FROM news_items WHERE DATE(analyzed_at) = '{date}'
        """)
        row = cur.fetchone()
        if row and row[0] > 0:
            results["news_summary_rate"] = f"{row[1]}/{row[0]} ({row[1]/row[0]*100:.1f}%)"
        else:
            results["news_summary_rate"] = "0건 (데이터 없음)"
        cur.close()
    except Exception as exc:
        results["error"] = str(exc)
    finally:
        conn.close()

    return results


def count_kafka_topic_offsets(brokers: str) -> dict[str, str]:
    """Kafka 토픽 파티션별 최신 offset 확인"""
    try:
        from kafka import KafkaConsumer
        from kafka.structs import TopicPartition
    except ImportError:
        return {"error": "kafka-python 미설치"}

    results = {}
    topics = ["airader.raw.news", "airader.raw.paper", "airader.raw.github"]

    try:
        consumer = KafkaConsumer(
            bootstrap_servers=[b.strip() for b in brokers.split(",") if b.strip()],
            client_id="pipeline-verifier",
            auto_offset_reset="earliest",
            enable_auto_commit=False,
            request_timeout_ms=5000,
            consumer_timeout_ms=3000,
        )
        for topic in topics:
            try:
                partitions = consumer.partitions_for_topic(topic) or set()
                if not partitions:
                    results[topic] = "토픽 없음 (메시지 미발행 상태)"
                    continue
                tps = [TopicPartition(topic, p) for p in partitions]
                end_offsets = consumer.end_offsets(tps)
                begin_offsets = consumer.beginning_offsets(tps)
                total_msgs = sum(end_offsets[tp] - begin_offsets[tp] for tp in tps)
                results[topic] = f"{total_msgs}개 메시지 (파티션 {len(partitions)}개)"
            except Exception as exc:
                results[topic] = f"조회 실패: {exc}"
        consumer.close()
    except Exception as exc:
        for topic in topics:
            results[topic] = f"Kafka 연결 실패: {exc}"

    return results


# ---------------------------------------------------------------------------
# 메인
# ---------------------------------------------------------------------------
def main() -> None:
    parser = argparse.ArgumentParser(description="AiRader 파이프라인 단계별 건수 검증")
    parser.add_argument("--date", default=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                        help="검증할 배치 날짜 (YYYY-MM-DD, 기본값: 오늘)")
    parser.add_argument("--pg-url", default=None,
                        help="PostgreSQL URL (예: postgresql://user:pw@localhost:5432/airadar)")
    parser.add_argument("--brokers", default=os.getenv("CRAWLER_KAFKA_BOOTSTRAP_SERVERS", "localhost:29092"),
                        help="Kafka 브로커 주소")
    parser.add_argument("--skip-minio", action="store_true", help="MinIO 조회 건너뜀")
    parser.add_argument("--skip-kafka", action="store_true", help="Kafka offset 조회 건너뜀")
    parser.add_argument("--skip-pg", action="store_true", help="PostgreSQL 조회 건너뜀")
    args = parser.parse_args()

    print("=" * 65)
    print(f"  AiRader 파이프라인 검증 — 날짜: {args.date}")
    print("=" * 65)

    # ------------------------------------------------------------------ Kafka
    if not args.skip_kafka:
        print(f"\n[1] Kafka 토픽 메시지 수 ({args.brokers})")
        offsets = count_kafka_topic_offsets(args.brokers)
        for topic, val in offsets.items():
            print(f"    {topic}: {val}")

    # ------------------------------------------------------------------ Bronze
    if not args.skip_minio:
        print(f"\n[2] Bronze Delta Lake ({MINIO_ENDPOINT}/{MINIO_BUCKET}/{BRONZE_BASE_PATH}/)")
        print("    ※ 파일 수 기준 (레코드 수 아님 — Delta 파일이 1개 이상이면 적재 성공)")
        for src in SOURCE_TYPES:
            cnt = count_bronze_objects(args.date, src)
            status = "파일 없음 ← 0건 원인!" if cnt == 0 else f"파일 {cnt}개"
            print(f"    [{src:8s}] {status}")

    # ------------------------------------------------------------------ Silver
    if not args.skip_minio:
        print(f"\n[3] Silver Delta Lake ({MINIO_ENDPOINT}/{MINIO_BUCKET}/{SILVER_BASE_PATH}/)")
        print("    ※ 파일 수 기준")
        for src in SOURCE_TYPES:
            cnt = count_silver_objects(src)
            status = "파일 없음" if cnt == 0 else f"파일 {cnt}개"
            print(f"    [{src:8s}] {status}")

    # ------------------------------------------------------------------ Gold
    if not args.skip_pg:
        print(f"\n[4] Gold PostgreSQL (analyzed_at/snapshot_date = {args.date})")
        gold = count_gold_rows(args.date, args.pg_url)
        for table, cnt in gold.items():
            marker = " ← 0건!" if cnt == 0 else ""
            print(f"    {table}: {cnt}건{marker}")

        # summary rate
        ratio = count_silver_error_ratio(args.date, args.pg_url)
        if "error" not in ratio:
            print(f"\n[5] AI 분석 품질 (뉴스 summary 완성률)")
            for k, v in ratio.items():
                print(f"    {k}: {v}")

    # ------------------------------------------------------------------ 진단
    print("\n" + "=" * 65)
    print("  0건 원인 진단 가이드")
    print("=" * 65)
    print("""
  Bronze 파일 없음  → 크롤링/Kafka 주입 문제
    ✓ inject_dummy_data.py 실행 후 KafkaBronzeConsumerJob 재실행

  Silver 파일 없음  → SilverRefinementJob 실패 또는 Bronze 날짜 불일치
    ✓ SilverRefinementJob 로그에서 "Bronze 읽기: 0건" 확인

  Gold 0건          → GoldServingJob 실패 또는 Silver error_log IS NULL = 0건
    ✓ Silver의 error_log 비율 확인 (AI 서버 장애 시 전체 error_log)

  AI 분석 실패      → ai-server 컨테이너 상태 확인
    ✓ docker logs airader-ai-server
    ✓ curl http://localhost:8000/health
""")


if __name__ == "__main__":
    main()
