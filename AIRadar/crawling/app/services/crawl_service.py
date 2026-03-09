from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from app.messaging.kafka_publisher import CrawlKafkaPublisher
from app.schemas import CrawlDomain, CrawlJobRequest, CrawlJobResponse, CrawledArticle, RawSaveResult
from app.sources.github_archive.github_api import GithubArchiveCrawler
from app.sources.github_archive.github_trending_archive import GithubTrendingArchiveCrawler
from app.sources.news.aitimes import AITimesCrawler
from app.sources.news.gdelt import GDELTNewsCrawler
from app.sources.paper.arxiv_api import ArxivApiCrawler


class CrawlService:
    def run_job(self, req: CrawlJobRequest) -> CrawlJobResponse:
        started_at = datetime.now(timezone.utc)
        job_id = str(uuid4())

        if req.domain == CrawlDomain.news:
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
                raise ValueError("news provider supports only aitimes|gdelt")
        elif req.domain == CrawlDomain.github_archive:
            if req.provider == "github_api":
                crawler = GithubArchiveCrawler()
                try:
                    parsed, errors, duplicate_count, failed_count = crawler.crawl(
                        max_articles=req.max_articles,
                        query_override=req.query_override,
                        min_stars=req.github_min_stars,
                        created_since_days=req.github_created_since_days,
                        sort=req.github_sort,
                        order=req.github_order,
                        include_readme=req.github_include_readme,
                    )
                finally:
                    crawler.close()
            elif req.provider == "github_trending_archive":
                crawler = GithubTrendingArchiveCrawler()
                try:
                    parsed, errors, duplicate_count, failed_count = crawler.crawl(
                        max_articles=req.max_articles,
                        window_hours=req.github_window_hours,
                        top_n=req.github_top_n,
                        pr_per_repo=req.github_pr_per_repo,
                    )
                finally:
                    crawler.close()
            else:
                raise ValueError("github_archive provider supports only github_api|github_trending_archive")
        elif req.domain == CrawlDomain.paper:
            if req.provider != "arxiv_api":
                raise ValueError("paper provider supports only arxiv_api")
            crawler = ArxivApiCrawler()
            try:
                parsed, errors, duplicate_count, failed_count = crawler.crawl(
                    max_articles=req.max_articles,
                    query_override=req.query_override,
                )
            finally:
                crawler.close()
        else:
            raise ValueError("Only news|paper|github_archive domains are implemented for now")

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
                extra=getattr(row, "extra", {}) or {},
            )
            for row in parsed
        ]

        kafka_result = CrawlKafkaPublisher().publish_items(
            job_id=job_id,
            domain=req.domain.value,
            provider=req.provider,
            items=items,
        )
        if kafka_result.failed > 0:
            errors.append(f"Kafka publish failed for {kafka_result.failed} items")

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
                "implemented_providers": {
                    "news": ["aitimes", "gdelt"],
                    "github_archive": ["github_api", "github_trending_archive"],
                    "paper": ["arxiv_api"],
                },
                "note": "raw storage is skipped for crawler providers in this phase",
                "kafka": {
                    "enabled": kafka_result.enabled,
                    "topic": kafka_result.topic,
                    "topic_stats": kafka_result.topic_stats,
                    "attempted": kafka_result.attempted,
                    "published": kafka_result.published,
                    "failed": kafka_result.failed,
                    "errors": kafka_result.errors[:20],
                },
            },
        )
