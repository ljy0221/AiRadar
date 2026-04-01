#!/usr/bin/env python3
"""
더미 데이터 Kafka 주입 스크립트

전체 파이프라인(Kafka → Bronze → Silver → Gold)을 검증하기 위해
실제 크롤링 서버와 동일한 CrawledArticle 포맷으로 더미 메시지를 Kafka에 발행한다.

사용법:
    python scripts/inject_dummy_data.py
    python scripts/inject_dummy_data.py --date 2025-03-17 --news 5 --paper 3 --github 2
    python scripts/inject_dummy_data.py --brokers localhost:29092
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from hashlib import sha1

try:
    from kafka import KafkaProducer
    from kafka.errors import NoBrokersAvailable
except ImportError:
    print("[ERROR] kafka-python 패키지가 필요합니다: pip install kafka-python")
    sys.exit(1)


# ---------------------------------------------------------------------------
# 환경변수 설정
# ---------------------------------------------------------------------------
DEFAULT_BROKERS = os.getenv("CRAWLER_KAFKA_BOOTSTRAP_SERVERS", "localhost:29092")
TOPIC_PREFIX = os.getenv("CRAWLER_KAFKA_TOPIC_PREFIX", "airader.raw")

TOPIC_NEWS = f"{TOPIC_PREFIX}.news"
TOPIC_PAPER = f"{TOPIC_PREFIX}.paper"
TOPIC_GITHUB = f"{TOPIC_PREFIX}.github"


# ---------------------------------------------------------------------------
# 더미 데이터 생성
# ---------------------------------------------------------------------------
def make_news_items(date: str, count: int) -> list[dict]:
    items = []
    for i in range(1, count + 1):
        url = f"https://dummy.example.com/news/ai-dummy-{i:03d}"
        items.append({
            "source": "news",
            "target": "ai_industry",
            "url": url,
            "title": f"[더미] AI 기술 혁신 뉴스 #{i}: 대형 언어 모델 최신 동향",
            "author": f"테스트 기자 {i}",
            "published_at": f"{date}T0{i % 9}:00:00Z",
            "body": (
                f"AI 기술이 빠르게 발전하면서 산업 전반에 걸쳐 큰 변화가 일어나고 있다. "
                f"특히 machine learning과 deep learning 분야에서 혁신적인 성과가 나타나고 있으며, "
                f"LLM(Large Language Model) 기술을 중심으로 AI 산업이 재편되고 있다. "
                f"더미 뉴스 #{i} — batch_date: {date}"
            ),
            "raw": {"saved": False, "key": "", "reason": "dummy_injection"},
            "extra": {},
        })
    return items


def make_paper_items(date: str, count: int) -> list[dict]:
    items = []
    categories_pool = [
        ["cs.AI", "cs.CL"],
        ["cs.AI", "cs.LG"],
        ["cs.CV", "cs.AI"],
        ["cs.RO", "cs.AI"],
        ["cs.AI", "cs.NE"],
    ]
    for i in range(1, count + 1):
        url = f"https://arxiv.org/abs/2503.dummy{i:03d}"
        cats = categories_pool[i % len(categories_pool)]
        items.append({
            "source": "paper",
            "target": "cs_ai",
            "url": url,
            "title": f"[Dummy] Advances in Large Language Models: Study #{i}",
            "author": f"Dummy Author {i}",
            "published_at": f"{date}T00:00:00Z",
            "body": (
                f"We present a novel approach #{i} to code generation using large language models. "
                f"Our method demonstrates significant improvements in machine learning benchmarks. "
                f"This is dummy paper #{i} — batch_date: {date}"
            ),
            "raw": {"saved": False, "key": "", "reason": "dummy_injection"},
            "extra": {
                "updated_at": f"{date}T00:00:00Z",
                "pdf_url": f"https://arxiv.org/pdf/2503.dummy{i:03d}",
                "categories": cats,
                "primary_category": cats[0],
                "search_query": "cat:cs.AI",
            },
        })
    return items


def make_github_items(date: str, count: int) -> list[dict]:
    repos = [
        ("dummy-org", "dummy-llm-framework", "Python", ["llm", "machine-learning", "ai"], 1234),
        ("ai-labs", "awesome-transformer", "Python", ["ai", "deep-learning", "nlp"], 5678),
        ("ml-team", "vision-ai-toolkit", "Python", ["computer-vision", "ai", "llm"], 890),
        ("openai-oss", "gpt-fine-tune", "Python", ["generative-ai", "llm", "ai"], 3210),
    ]
    items = []
    for i in range(count):
        org, repo_name, lang, topics, stars = repos[i % len(repos)]
        full_name = f"{org}/{repo_name}-{i + 1}"
        url = f"https://github.com/{full_name}"
        items.append({
            "source": "github_archive",
            "target": "ai_repositories",
            "url": url,
            "title": full_name,
            "author": org,
            "published_at": f"{date}T00:00:00Z",
            "body": f"A state-of-the-art LLM framework #{i + 1} for production AI use. dummy repo — batch_date: {date}",
            "raw": {"saved": False, "key": "", "reason": "dummy_injection"},
            "extra": {
                "full_name": full_name,
                "language": lang,
                "stars": stars + i * 100,
                "forks": stars // 10,
                "topics": topics,
                "readme_excerpt": f"## {repo_name}\n\nDummy repository #{i + 1} for pipeline testing.\n\nThis AI framework supports machine learning and deep learning workflows.",
                "open_issues": 12 + i,
                "watchers": stars + i * 100,
                "license": "MIT",
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": f"{date}T00:00:00Z",
                "pushed_at": f"{date}T00:00:00Z",
                "recent_commit_messages": [
                    {"sha": f"abc{i:03d}1", "message": "feat: add dummy feature", "date": f"{date}T00:00:00Z"},
                    {"sha": f"abc{i:03d}2", "message": "fix: dummy bug fix", "date": f"{date}T00:00:00Z"},
                ],
            },
        })
    return items


# ---------------------------------------------------------------------------
# Kafka 발행
# ---------------------------------------------------------------------------
def build_producer(brokers: str) -> KafkaProducer:
    return KafkaProducer(
        bootstrap_servers=[b.strip() for b in brokers.split(",") if b.strip()],
        client_id="dummy-injector",
        acks="all",
        retries=3,
        linger_ms=50,
        request_timeout_ms=15000,
        key_serializer=lambda v: v.encode("utf-8"),
        value_serializer=lambda v: json.dumps(v, ensure_ascii=False).encode("utf-8"),
    )


def publish_items(producer: KafkaProducer, topic: str, items: list[dict], label: str) -> int:
    published = 0
    for item in items:
        key = sha1(item["url"].encode("utf-8")).hexdigest()
        try:
            producer.send(topic, key=key, value=item).get(timeout=10)
            published += 1
            print(f"  [OK] {label} → {topic}: {item['title'][:50]}")
        except Exception as exc:
            print(f"  [FAIL] {label} → {topic}: {exc}")
    return published


# ---------------------------------------------------------------------------
# 메인
# ---------------------------------------------------------------------------
def main() -> None:
    parser = argparse.ArgumentParser(description="AiRader 파이프라인 더미 데이터 Kafka 주입 스크립트")
    parser.add_argument("--date", default=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                        help="배치 날짜 (YYYY-MM-DD, 기본값: 오늘)")
    parser.add_argument("--news", type=int, default=5, help="뉴스 더미 건수 (기본: 5)")
    parser.add_argument("--paper", type=int, default=3, help="논문 더미 건수 (기본: 3)")
    parser.add_argument("--github", type=int, default=2, help="GitHub 더미 건수 (기본: 2)")
    parser.add_argument("--brokers", default=DEFAULT_BROKERS, help=f"Kafka 브로커 주소 (기본: {DEFAULT_BROKERS})")
    args = parser.parse_args()

    print("=" * 60)
    print(f"[더미 주입] 날짜={args.date}, 브로커={args.brokers}")
    print(f"  뉴스={args.news}건, 논문={args.paper}건, GitHub={args.github}건")
    print("=" * 60)

    # 데이터 생성
    news_items = make_news_items(args.date, args.news)
    paper_items = make_paper_items(args.date, args.paper)
    github_items = make_github_items(args.date, args.github)

    # Kafka 연결
    print(f"\n[Kafka] 브로커 연결 중: {args.brokers}")
    try:
        producer = build_producer(args.brokers)
    except NoBrokersAvailable:
        print(f"[ERROR] Kafka 브로커에 연결할 수 없습니다: {args.brokers}")
        print("  → Docker 환경에서 실행 시 'localhost:29092' 또는 컨테이너 네트워크 주소를 사용하세요.")
        sys.exit(1)

    # 발행
    total = 0
    print(f"\n[뉴스] {TOPIC_NEWS} 토픽에 {len(news_items)}건 발행 중...")
    total += publish_items(producer, TOPIC_NEWS, news_items, "news")

    print(f"\n[논문] {TOPIC_PAPER} 토픽에 {len(paper_items)}건 발행 중...")
    total += publish_items(producer, TOPIC_PAPER, paper_items, "paper")

    print(f"\n[GitHub] {TOPIC_GITHUB} 토픽에 {len(github_items)}건 발행 중...")
    total += publish_items(producer, TOPIC_GITHUB, github_items, "github")

    producer.flush(timeout=10)
    producer.close(timeout=10)

    expected = args.news + args.paper + args.github
    print("\n" + "=" * 60)
    print(f"[완료] 총 {total}/{expected}건 발행 성공")
    print()
    print("다음 단계:")
    print(f"  1. Bronze 적재: Airflow에서 bronze_kafka_ingestion DAG 실행")
    print(f"     또는: ./gradlew runSparkJob -Pjob=KafkaBronzeConsumerJob")
    print(f"  2. Silver 정제: ./gradlew runSparkJob -Pjob=SilverRefinementJob -Pdate={args.date} -PsourceType=news")
    print(f"  3. Gold 서빙:   ./gradlew runSparkJob -Pjob=GoldServingJob -Pdate={args.date}")
    print(f"  4. 검증:        python scripts/verify_pipeline.py --date {args.date}")
    print("=" * 60)


if __name__ == "__main__":
    main()
