from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.schemas import CrawlJobRequest, CrawlJobResponse
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
            "paper": [],
            "github_archive": [],
        },
        "news_targets": {
            "aitimes": ["ai_industry", "ai_company"],
            "gdelt": ["world_ai"],
        },
    }


@router.post("/crawl/jobs", response_model=CrawlJobResponse)
def run_crawl_job(req: CrawlJobRequest) -> CrawlJobResponse:
    try:
        return service.run_job(req)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
