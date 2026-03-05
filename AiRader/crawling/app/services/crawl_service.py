from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from app.schemas import CrawlDomain, CrawlJobRequest, CrawlJobResponse, CrawledArticle, RawSaveResult
from app.sources.news.aitimes import AITimesCrawler
from app.sources.news.gdelt import GDELTNewsCrawler


class CrawlService:
    def run_job(self, req: CrawlJobRequest) -> CrawlJobResponse:
        started_at = datetime.now(timezone.utc)
        job_id = str(uuid4())

        if req.domain != CrawlDomain.news:
            raise ValueError("Only news domain is implemented for now")
        if req.provider == "aitimes":
            crawler = AITimesCrawler()
            try:
                parsed, errors, duplicate_count, failed_count = crawler.crawl(
                    targets=req.targets,
                    max_pages_per_target=req.max_pages_per_target,
                    max_articles=req.max_articles,
                )
            finally:
                crawler.close()
        elif req.provider == "gdelt":
            crawler = GDELTNewsCrawler()
            try:
                parsed, errors, duplicate_count, failed_count = crawler.crawl(
                    max_articles=req.max_articles,
                    window_minutes=req.window_minutes,
                    query_override=req.query_override,
                    languages=req.languages,
                )
            finally:
                crawler.close()
        else:
            raise ValueError("Only provider=aitimes|gdelt is implemented for now")

        items = [
            CrawledArticle(
                source=row.source,
                target=row.target,
                url=row.url,
                title=row.title,
                author=row.author,
                published_at=row.published_at,
                body=row.body,
                raw=RawSaveResult(
                    saved=row.raw_saved,
                    key=row.raw_key,
                    reason=row.raw_reason,
                ),
            )
            for row in parsed
        ]

        finished_at = datetime.now(timezone.utc)
        return CrawlJobResponse(
            job_id=job_id,
            domain=req.domain,
            provider=req.provider,
            started_at=started_at,
            finished_at=finished_at,
            total_urls=len(items) + failed_count,
            crawled_count=len(items),
            failed_count=failed_count,
            skipped_duplicates=duplicate_count,
            items=items,
            errors=errors,
            metadata={
                "implemented_domains": ["news", "paper", "github_archive"],
                "implemented_providers": ["aitimes", "gdelt"],
                "note": "paper/github_archive providers are scaffold-only in this phase",
            },
        )
