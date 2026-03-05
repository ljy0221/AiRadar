from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class CrawlDomain(str, Enum):
    news = "news"
    paper = "paper"
    github_archive = "github_archive"


class NewsProvider(str, Enum):
    aitimes = "aitimes"
    gdelt = "gdelt"


class AITimesTarget(str, Enum):
    ai_industry = "ai_industry"
    ai_company = "ai_company"


class CrawlJobRequest(BaseModel):
    domain: CrawlDomain = Field(default=CrawlDomain.news)
    provider: str = Field(default=NewsProvider.aitimes.value)
    targets: list[str] = Field(default_factory=list)
    max_pages_per_target: int = Field(default=3, ge=1, le=100)
    max_articles: int = Field(default=200, ge=1, le=5000)
    window_minutes: int = Field(default=15, ge=15, le=1440)
    query_override: str | None = None
    languages: list[str] = Field(default_factory=list)


class RawSaveResult(BaseModel):
    saved: bool
    key: str
    reason: str | None = None


class CrawledArticle(BaseModel):
    source: str
    target: str
    url: str
    title: str
    author: str | None = None
    published_at: str | None = None
    body: str
    raw: RawSaveResult | None = None


class CrawlJobResponse(BaseModel):
    job_id: str
    domain: CrawlDomain
    provider: str
    started_at: datetime
    finished_at: datetime
    total_urls: int
    crawled_count: int
    failed_count: int
    skipped_duplicates: int
    items: list[CrawledArticle] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)
