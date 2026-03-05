from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from hashlib import sha1

import httpx

from app.config import settings

GDELT_DOC_API = "https://api.gdeltproject.org/api/v2/doc/doc"
DEFAULT_AI_QUERY = (
    '"artificial intelligence" OR "generative ai" OR "large language model" '
    'OR llm OR "machine learning" OR "deep learning" OR "ai chip" '
    'OR "ai regulation" OR "ai startup"'
)


@dataclass
class ParsedArticle:
    source: str
    target: str
    url: str
    title: str
    author: str | None
    published_at: str | None
    body: str
    raw_key: str
    raw_saved: bool
    raw_reason: str | None


class GDELTNewsCrawler:
    def __init__(self) -> None:
        self.client = httpx.Client(
            timeout=settings.request_timeout_sec,
            headers={"User-Agent": settings.user_agent},
            follow_redirects=True,
        )

    def close(self) -> None:
        self.client.close()

    def crawl(
        self,
        max_articles: int,
        window_minutes: int,
        query_override: str | None = None,
        languages: list[str] | None = None,
    ) -> tuple[list[ParsedArticle], list[str], int, int]:
        query = query_override.strip() if query_override else DEFAULT_AI_QUERY
        lang = (languages or [None])[0]

        params = self._build_params(
            query=query,
            max_articles=max_articles,
            window_minutes=window_minutes,
            language=lang,
        )

        errors: list[str] = []
        duplicate_count = 0
        failed_count = 0

        resp = self.client.get(GDELT_DOC_API, params=params)
        resp.raise_for_status()
        payload = resp.json()
        raw_articles = payload.get("articles", [])

        results: list[ParsedArticle] = []
        seen_urls: set[str] = set()
        for row in raw_articles:
            try:
                url = (row.get("url") or "").strip()
                if not url:
                    failed_count += 1
                    continue

                if url in seen_urls:
                    duplicate_count += 1
                    continue
                seen_urls.add(url)

                title = (row.get("title") or "").strip() or "Untitled"
                published_at = self._to_iso8601(row.get("seendate"))
                snippet = (row.get("seendate") or "").strip()
                key = self._build_raw_key(url)

                results.append(
                    ParsedArticle(
                        source="news",
                        target="world_ai",
                        url=url,
                        title=title,
                        author=None,
                        published_at=published_at,
                        body=snippet,
                        raw_key=key,
                        raw_saved=False,
                        raw_reason="S3 save skipped for gdelt provider",
                    )
                )
            except Exception as exc:  # noqa: BLE001
                failed_count += 1
                errors.append(str(exc))

        return results, errors, duplicate_count, failed_count

    @staticmethod
    def _build_params(
        query: str,
        max_articles: int,
        window_minutes: int,
        language: str | None,
    ) -> dict[str, str]:
        now = datetime.now(timezone.utc)
        start = now - timedelta(minutes=window_minutes)
        params: dict[str, str] = {
            "query": query,
            "mode": "ArtList",
            "format": "json",
            "sort": "DateDesc",
            "startdatetime": start.strftime("%Y%m%d%H%M%S"),
            "enddatetime": now.strftime("%Y%m%d%H%M%S"),
            "maxrecords": str(max_articles),
        }
        if language:
            params["searchlang"] = language
        return params

    @staticmethod
    def _build_raw_key(url: str) -> str:
        now = datetime.now(timezone.utc)
        digest = sha1(url.encode("utf-8")).hexdigest()
        return (
            f"raw/news/gdelt/world_ai/"
            f"{now.year:04d}/{now.month:02d}/{now.day:02d}/{digest}.json"
        )

    @staticmethod
    def _to_iso8601(seendate: str | None) -> str | None:
        if not seendate:
            return None

        text = seendate.strip()
        for fmt in ("%Y%m%dT%H%M%SZ", "%Y%m%d%H%M%S"):
            try:
                dt = datetime.strptime(text, fmt).replace(tzinfo=timezone.utc)
                return dt.isoformat()
            except ValueError:
                continue
        return text
