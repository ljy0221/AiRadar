#!/usr/bin/env python3
"""
벌크 데이터 수집 스크립트

크롤링 서버의 /crawl/jobs 엔드포인트를 날짜별로 반복 호출하여
Bronze Delta Lake에 과거 데이터를 적재한다.

크롤링 서버는 실제 외부 API(ArXiv, GDELT, AITimes, GitHub)를 호출하고
Kafka로 발행 → KafkaBronzeConsumerJob이 Bronze에 적재한다.

사용법:
    python scripts/bulk_ingest.py
    python scripts/bulk_ingest.py --start 2026-02-17 --end 2026-03-16
    python scripts/bulk_ingest.py --start 2026-02-17 --end 2026-03-16 --types news paper github
    python scripts/bulk_ingest.py --crawl-url http://localhost:18002 --delay 5
"""

from __future__ import annotations

import argparse
import json
import sys
import threading
import time
import urllib.request
import urllib.error
from datetime import datetime, timedelta, timezone


# ---------------------------------------------------------------------------
# 기본값
# ---------------------------------------------------------------------------
DEFAULT_CRAWL_URL = "http://localhost:18002"
DEFAULT_DELAY_SEC = 3  # 날짜 간 딜레이 (외부 API 부하 방지)

# 크롤링 서버 /crawl/jobs 요청 페이로드 템플릿
CRAWL_CONFIGS = {
    "news_aitimes": {
        "domain": "news",
        "provider": "aitimes",
        "targets": ["ai_industry", "ai_company"],
        "max_pages_per_target": 10,
        "max_articles": 500,
    },
    "news_gdelt": {
        "domain": "news",
        "provider": "gdelt",
        "targets": ["world_ai"],
        "window_minutes": 1440,  # 24시간
        "max_articles": 500,
    },
    "paper_arxiv": {
        "domain": "paper",
        "provider": "arxiv_api",
        "targets": ["cs_ai"],
        "max_articles": 500,
    },
    "github": {
        "domain": "github_archive",
        "provider": "github_api",
        "targets": ["ai_repositories"],
        "github_min_stars": 10,
        "github_created_since_days": 30,
        "github_top_n": 100,
        "github_include_readme": True,
    },
}

TYPE_TO_CONFIGS = {
    "news": ["news_aitimes", "news_gdelt"],
    "paper": ["paper_arxiv"],
    "github": ["github"],
}


# ---------------------------------------------------------------------------
# 프로그레스 바
# ---------------------------------------------------------------------------
BAR_WIDTH = 30

def progress_bar(current: int, total: int, label: str = "") -> str:
    filled = int(BAR_WIDTH * current / total) if total > 0 else 0
    bar = "█" * filled + "░" * (BAR_WIDTH - filled)
    pct = int(100 * current / total) if total > 0 else 0
    return f"[{bar}] {pct:3d}% {current}/{total} {label}"


class Spinner:
    """요청 대기 중 스피너를 백그라운드 스레드로 출력"""
    FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"]

    def __init__(self, label: str) -> None:
        self.label = label
        self._stop = threading.Event()
        self._thread = threading.Thread(target=self._spin, daemon=True)

    def _spin(self) -> None:
        idx = 0
        start = time.time()
        while not self._stop.is_set():
            elapsed = int(time.time() - start)
            frame = self.FRAMES[idx % len(self.FRAMES)]
            sys.stdout.write(f"\r  {frame} {self.label} ({elapsed}s 경과)...")
            sys.stdout.flush()
            idx += 1
            time.sleep(0.1)

    def start(self) -> None:
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        self._thread.join()
        sys.stdout.write("\r" + " " * 60 + "\r")
        sys.stdout.flush()


# ---------------------------------------------------------------------------
# HTTP 호출
# ---------------------------------------------------------------------------
def call_crawl_jobs(crawl_url: str, payload: dict, timeout: int = 300) -> dict:
    body = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        f"{crawl_url}/crawl/jobs",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


# ---------------------------------------------------------------------------
# 날짜 범위 생성
# ---------------------------------------------------------------------------
def date_range(start: str, end: str) -> list[str]:
    start_dt = datetime.strptime(start, "%Y-%m-%d")
    end_dt = datetime.strptime(end, "%Y-%m-%d")
    dates = []
    cur = start_dt
    while cur <= end_dt:
        dates.append(cur.strftime("%Y-%m-%d"))
        cur += timedelta(days=1)
    return dates


# ---------------------------------------------------------------------------
# 메인
# ---------------------------------------------------------------------------
def main() -> None:
    today = datetime.now(timezone.utc)
    default_end = (today - timedelta(days=1)).strftime("%Y-%m-%d")
    default_start = (today - timedelta(days=30)).strftime("%Y-%m-%d")

    parser = argparse.ArgumentParser(description="AiRader 벌크 데이터 수집 스크립트")
    parser.add_argument("--start", default=default_start, help=f"시작 날짜 (기본: {default_start})")
    parser.add_argument("--end", default=default_end, help=f"종료 날짜 (기본: {default_end})")
    parser.add_argument("--types", nargs="+", default=["news", "paper", "github"],
                        choices=["news", "paper", "github"], help="수집할 데이터 타입")
    parser.add_argument("--crawl-url", default=DEFAULT_CRAWL_URL, help=f"크롤링 서버 URL (기본: {DEFAULT_CRAWL_URL})")
    parser.add_argument("--delay", type=float, default=DEFAULT_DELAY_SEC,
                        help=f"요청 간 딜레이(초) (기본: {DEFAULT_DELAY_SEC})")
    parser.add_argument("--dry-run", action="store_true", help="실제 요청 없이 계획만 출력")
    args = parser.parse_args()

    configs = []
    for t in args.types:
        configs.extend(TYPE_TO_CONFIGS[t])
    # 중복 제거 (순서 유지)
    seen = set()
    configs = [c for c in configs if not (c in seen or seen.add(c))]

    print("=" * 65)
    print(f"  AiRader 벌크 수집 (1회 대량 수집)")
    print(f"  타입: {', '.join(args.types)}")
    print(f"  크롤링 서버: {args.crawl_url}")
    print(f"  총 요청 수: {len(configs)}회")
    print("=" * 65)

    if args.dry_run:
        print("\n[DRY RUN] 실제 요청 없이 계획만 출력합니다.")
        for cfg_name in configs:
            cfg = CRAWL_CONFIGS[cfg_name]
            print(f"  {cfg_name}: max_articles={cfg.get('max_articles', '-')}")
        return

    total_collected = 0
    total_failed = 0
    results_summary = []

    for idx, cfg_name in enumerate(configs):
        payload = dict(CRAWL_CONFIGS[cfg_name])
        max_cnt = payload.get("max_articles", payload.get("github_top_n", "?"))

        # 전체 진행 바 출력
        print(f"\n전체 진행: {progress_bar(idx, len(configs), f'({idx+1}/{len(configs)}) {cfg_name}')}")
        print(f"  요청: {cfg_name} (최대 {max_cnt}건)")

        spinner = Spinner(f"{cfg_name} 수집")
        spinner.start()

        try:
            result = call_crawl_jobs(args.crawl_url, payload, timeout=600)
            spinner.stop()

            crawled = result.get("crawled_count", 0)
            failed = result.get("failed_count", 0)
            kafka = result.get("metadata", {}).get("kafka", {})
            published = sum(
                v.get("published", 0) for v in kafka.values()
                if isinstance(v, dict)
            )

            # 수집 결과 바
            bar = progress_bar(crawled, max_cnt if isinstance(max_cnt, int) else crawled, "수집완료")
            print(f"  {bar}")
            print(f"  ✓ 수집 {crawled}건 | Kafka 발행 {published}건 | 실패 {failed}건")

            total_collected += crawled
            total_failed += failed
            results_summary.append({
                "type": cfg_name,
                "crawled": crawled, "published": published, "failed": failed,
            })

        except urllib.error.HTTPError as e:
            spinner.stop()
            print(f"  ✗ HTTP 오류 {e.code}: {e.reason}")
            total_failed += 1
            results_summary.append({
                "type": cfg_name, "crawled": 0, "published": 0, "failed": 1,
                "error": str(e),
            })
        except Exception as exc:
            spinner.stop()
            print(f"  ✗ 오류: {exc}")
            total_failed += 1
            results_summary.append({
                "type": cfg_name, "crawled": 0, "published": 0, "failed": 1,
                "error": str(exc),
            })

        if idx < len(configs) - 1:
            time.sleep(args.delay)

    # 최종 전체 완료 바
    print(f"\n전체 진행: {progress_bar(len(configs), len(configs), '완료!')}")

    # 최종 요약
    print("\n" + "=" * 65)
    print(f"  벌크 수집 완료")
    print(f"  총 수집: {total_collected}건")
    print(f"  총 실패: {total_failed}건")
    print("=" * 65)

    # 0건인 날짜/타입 출력
    zero_results = [r for r in results_summary if r["crawled"] == 0 and "error" not in r]
    if zero_results:
        print(f"\n[주의] 0건 수집된 항목 ({len(zero_results)}개):")
        for r in zero_results:
            print(f"  {r['date']} | {r['type']}")

    print(f"""
다음 단계:
  1. Airflow UI에서 bronze_kafka_ingestion DAG 트리거
     → Kafka 메시지를 Bronze Delta Lake에 적재

  2. 날짜별로 silver_refinement DAG 트리거
     → Bronze → AI 서버 분석 → Silver

  3. gold_serving DAG 트리거
     → Silver → PostgreSQL Upsert
""")


if __name__ == "__main__":
    main()
