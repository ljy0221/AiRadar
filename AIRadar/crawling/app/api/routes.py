from __future__ import annotations

from datetime import datetime, timezone
from hashlib import sha1
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query

from app.messaging.kafka_publisher import CrawlKafkaPublisher
from app.schemas import CrawlDomain, CrawlJobRequest, CrawlJobResponse, CrawledArticle, RawSaveResult
from app.services.crawl_service import CrawlService

router = APIRouter()
service = CrawlService()


@router.get("/")
def read_root() -> dict:
    return {"message": "Crawling server is running"}


@router.get("/health")
def health_check() -> dict:
    return {"status": "ok"}


@router.get("/crawl/capabilities")
def crawl_capabilities() -> dict:
    return {
        "domains": ["news", "paper", "github_archive"],
        "providers": {
            "news": ["aitimes", "gdelt"],
            "paper": ["arxiv_api"],
            "github_archive": ["github_api", "github_trending_archive"],
        },
        "news_targets": {
            "aitimes": ["ai_industry", "ai_company"],
            "gdelt": ["world_ai"],
        },
        "paper_targets": {
            "arxiv_api": ["cs_ai"],
        },
        "github_archive_targets": {
            "github_api": ["ai_repositories"],
            "github_trending_archive": ["trending_repo", "repo_pr_document"],
        },
    }


@router.post("/crawl/jobs", response_model=CrawlJobResponse)
def run_crawl_job(req: CrawlJobRequest) -> CrawlJobResponse:
    try:
        return service.run_job(req)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/crawl/dummy", response_model=CrawlJobResponse)
def run_dummy_crawl(
    date: str = Query(default=None, description="배치 날짜 (YYYY-MM-DD). 미입력 시 오늘"),
    news_count: int = Query(default=5, ge=1, le=50, description="뉴스 더미 건수"),
    paper_count: int = Query(default=3, ge=1, le=50, description="논문 더미 건수"),
    github_count: int = Query(default=2, ge=1, le=20, description="GitHub 더미 건수"),
    publish_kafka: bool = Query(default=True, description="Kafka에도 발행할지 여부"),
) -> CrawlJobResponse:
    """
    더미 데이터를 생성하여 반환하고, 선택적으로 Kafka에 발행한다.

    파이프라인 end-to-end 검증용 엔드포인트 — 외부 API를 호출하지 않는다.
    BronzeIngestionJob이 이 엔드포인트를 호출하면 즉시 더미 데이터를 받을 수 있다.
    """
    if date is None:
        date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

    started_at = datetime.now(timezone.utc)
    job_id = str(uuid4())
    items: list[CrawledArticle] = []

    # 뉴스 더미
    for i in range(1, news_count + 1):
        url = f"https://dummy.example.com/news/{date}/ai-dummy-{i:03d}"
        items.append(CrawledArticle(
            source="news",
            target="ai_industry",
            url=url,
            title=f"[더미] AI 기술 혁신 뉴스 #{i}: 대형 언어 모델 최신 동향 ({date})",
            author=f"테스트 기자 {i}",
            published_at=f"{date}T0{i % 9}:00:00Z",
            body=(
                f"AI 기술이 빠르게 발전하면서 산업 전반에 걸쳐 큰 변화가 일어나고 있다. "
                f"machine learning과 deep learning 분야에서 혁신적인 성과가 나타나고 있으며, "
                f"LLM 기술을 중심으로 AI 산업이 재편되고 있다. 더미 뉴스 #{i} — batch_date: {date}"
            ),
            raw=RawSaveResult(saved=False, key="", reason="dummy_endpoint"),
            extra={},
        ))

    # 논문 더미
    cats_pool = [["cs.AI", "cs.CL"], ["cs.AI", "cs.LG"], ["cs.CV", "cs.AI"]]
    for i in range(1, paper_count + 1):
        url = f"https://arxiv.org/abs/2503.dummy{i:03d}"
        cats = cats_pool[i % len(cats_pool)]
        items.append(CrawledArticle(
            source="paper",
            target="cs_ai",
            url=url,
            title=f"[Dummy] Advances in LLM Research: Study #{i} ({date})",
            author=f"Dummy Author {i}",
            published_at=f"{date}T00:00:00Z",
            body=(
                f"We present a novel approach #{i} using large language models. "
                f"Our method demonstrates significant improvements in machine learning benchmarks. "
                f"Dummy paper #{i} — batch_date: {date}"
            ),
            raw=RawSaveResult(saved=False, key="", reason="dummy_endpoint"),
            extra={
                "updated_at": f"{date}T00:00:00Z",
                "pdf_url": f"https://arxiv.org/pdf/2503.dummy{i:03d}",
                "categories": cats,
                "primary_category": cats[0],
                "search_query": "cat:cs.AI",
            },
        ))

    # GitHub 더미
    repos = [
        ("dummy-org", "llm-framework", "Python", ["llm", "machine-learning", "ai"], 1234),
        ("ai-labs", "transformer-kit", "Python", ["ai", "deep-learning", "nlp"], 5678),
        ("ml-team", "vision-ai", "Python", ["computer-vision", "ai", "llm"], 890),
    ]
    for i in range(github_count):
        org, repo_name, lang, topics, stars = repos[i % len(repos)]
        full_name = f"{org}/{repo_name}-dummy-{i + 1}"
        url = f"https://github.com/{full_name}"
        items.append(CrawledArticle(
            source="github_archive",
            target="ai_repositories",
            url=url,
            title=full_name,
            author=org,
            published_at=f"{date}T00:00:00Z",
            body=f"A state-of-the-art AI framework #{i + 1} for production use. dummy — batch_date: {date}",
            raw=RawSaveResult(saved=False, key="", reason="dummy_endpoint"),
            extra={
                "full_name": full_name,
                "language": lang,
                "stars": stars + i * 100,
                "forks": stars // 10,
                "topics": topics,
                "readme_excerpt": f"## {repo_name}\n\nDummy repository for pipeline testing. AI and machine learning framework.",
                "open_issues": 12 + i,
                "watchers": stars + i * 100,
                "license": "MIT",
                "created_at": "2024-01-01T00:00:00Z",
                "updated_at": f"{date}T00:00:00Z",
                "pushed_at": f"{date}T00:00:00Z",
                "recent_commit_messages": [
                    {"sha": sha1(f"{full_name}-1".encode()).hexdigest()[:8],
                     "message": "feat: dummy feature", "date": f"{date}T00:00:00Z"},
                ],
            },
        ))

    # Kafka 발행 (선택)
    kafka_meta: dict = {}
    if publish_kafka:
        publisher = CrawlKafkaPublisher()
        # 도메인별로 분리하여 발행
        news_items = [it for it in items if it.source == "news"]
        paper_items = [it for it in items if it.source == "paper"]
        github_items = [it for it in items if it.source == "github_archive"]

        for domain_str, domain_items in [
            ("news", news_items),
            ("paper", paper_items),
            ("github_archive", github_items),
        ]:
            if domain_items:
                result = publisher.publish_items(job_id, domain_str, "dummy", domain_items)
                kafka_meta[domain_str] = {
                    "enabled": result.enabled,
                    "topic": result.topic,
                    "published": result.published,
                    "failed": result.failed,
                }

    finished_at = datetime.now(timezone.utc)
    return CrawlJobResponse(
        job_id=job_id,
        domain=CrawlDomain.news,  # 복합 도메인이지만 스키마 제약상 대표값 사용
        provider="dummy",
        started_at=started_at,
        finished_at=finished_at,
        total_urls=len(items),
        crawled_count=len(items),
        failed_count=0,
        skipped_duplicates=0,
        items=items,
        errors=[],
        metadata={"kafka": kafka_meta, "batch_date": date, "dummy": True},
    )
