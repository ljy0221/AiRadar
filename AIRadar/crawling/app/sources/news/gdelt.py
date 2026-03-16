from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from datetime import datetime, timezone
from hashlib import sha1
import re
import time

import httpx
from bs4 import BeautifulSoup

from app.config import settings

GDELT_DOC_API = "https://api.gdeltproject.org/api/v2/doc/doc"
AI_INCLUDE_TERMS = [
    '"artificial intelligence"',
    '"generative ai"',
    '"large language model"',
    "llm",
    '"machine learning"',
    '"natural language processing"',
    '"ai agent"',
    '"ai chip"',
    '"ai regulation"',
    '"ai safety"',
    '"openai"',
]
FETCH_CONCURRENCY = 4
MAX_FETCH_MULTIPLIER = 3

AI_STRONG_KEYWORDS = [
    "artificial intelligence",
    "generative ai",
    "large language model",
    "foundation model",
    "machine learning",
    "deep learning",
    "computer vision",
    "natural language processing",
    "ai model",
    "ai system",
    "openai",
    "anthropic",
    "google deepmind",
    "meta ai",
]

AI_WEAK_KEYWORDS = [
    "llm",
    "chatbot",
    "inference",
    "prompt",
    "token",
    "gpu",
    "ai chip",
    "ai regulation",
    "ai safety",
    "autonomous agent",
]

def build_default_ai_query() -> str:
    include = " OR ".join(AI_INCLUDE_TERMS)
    return f"({include})"


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
        query = query_override.strip() if query_override else build_default_ai_query()
        lang = (languages or [None])[0]
        effective_window = max(window_minutes, 30)

        errors: list[str] = []
        if effective_window != window_minutes:
            errors.append(
                f"GDELT minimum timespan constraint applied: requested={window_minutes}m, used={effective_window}m"
            )
        params = self._build_params(
            query=query,
            max_articles=min(max_articles * MAX_FETCH_MULTIPLIER, 250),
            window_minutes=effective_window,
            language=lang,
        )
        duplicate_count = 0
        failed_count = 0
        filtered_out_count = 0

        resp = self._request_with_retry(params=params)
        if isinstance(resp, str):
            return [], [resp], 0, 0
        if resp.status_code >= 400:
            return [], [f"GDELT HTTP error: {resp.status_code}"], 0, 0

        try:
            payload = resp.json()
        except Exception as exc:  # noqa: BLE001
            preview = resp.text[:180].replace("\n", " ").strip()
            return [], [f"GDELT JSON parse failed: {exc}; body={preview}"], 0, 0
        raw_articles = payload.get("articles", [])

        candidates: list[tuple[str, str, str | None, str]] = []
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

                title = (row.get("title") or "").strip()
                published_at = self._to_iso8601(row.get("seendate"))
                snippet = (row.get("snippet") or "").strip()
                candidates.append((url, title, published_at, snippet))
            except Exception as exc:  # noqa: BLE001
                failed_count += 1
                errors.append(str(exc))

        fetch_limit = min(len(candidates), max_articles * MAX_FETCH_MULTIPLIER)
        candidates = candidates[:fetch_limit]

        results: list[ParsedArticle] = []
        with ThreadPoolExecutor(max_workers=FETCH_CONCURRENCY) as executor:
            futures = [executor.submit(self._fetch_and_filter, item) for item in candidates]
            for future in as_completed(futures):
                try:
                    parsed, is_filtered_out, err = future.result()
                except Exception as exc:  # noqa: BLE001
                    failed_count += 1
                    errors.append(f"Worker failure: {exc}")
                    continue

                if err:
                    failed_count += 1
                    errors.append(err)
                    continue
                if is_filtered_out:
                    filtered_out_count += 1
                    continue
                if parsed:
                    results.append(parsed)

        if filtered_out_count > 0:
            errors.append(f"Filtered out {filtered_out_count} articles by title+body AI keyword match")

        return results[:max_articles], errors, duplicate_count, failed_count

    def _fetch_and_filter(
        self,
        item: tuple[str, str, str | None, str],
    ) -> tuple[ParsedArticle | None, bool, str | None]:
        url, seed_title, published_at, snippet = item

        try:
            fetched_title, body = self._fetch_article_content(url)
        except Exception as exc:  # noqa: BLE001
            return None, False, f"{url} -> fetch failed: {exc}"

        title = fetched_title or seed_title or "Untitled"
        if not self._is_ai_relevant(title=title, body=body):
            return None, True, None

        merged_body = body if body else snippet
        return (
            ParsedArticle(
                source="news",
                target="world_ai",
                url=url,
                title=title,
                author=None,
                published_at=published_at,
                body=merged_body,
                raw_key=self._build_raw_key(url),
                raw_saved=False,
                raw_reason="S3 save skipped for gdelt provider",
            ),
            False,
            None,
        )

    def _fetch_article_content(self, url: str) -> tuple[str, str]:
        resp = self.client.get(url)
        resp.raise_for_status()
        html = resp.text
        soup = BeautifulSoup(html, "html.parser")

        for tag in soup(["script", "style", "noscript"]):
            tag.decompose()

        title = self._extract_title(soup)
        body = self._extract_body(soup)
        if not body:
            raise ValueError("empty body")
        time.sleep(settings.request_delay_sec)
        return title, body

    @staticmethod
    def _extract_title(soup: BeautifulSoup) -> str:
        for selector in [
            'meta[property="og:title"]',
            "h1",
            "title",
        ]:
            node = soup.select_one(selector)
            if not node:
                continue
            text = (node.get("content") if selector.startswith("meta") else node.get_text(" ", strip=True)) or ""
            text = text.strip()
            if text:
                return text
        return ""

    @staticmethod
    def _extract_body(soup: BeautifulSoup) -> str:
        for selector in [
            "article",
            "[itemprop='articleBody']",
            ".article-body",
            ".post-content",
            ".entry-content",
            ".content",
            "#content",
        ]:
            nodes = soup.select(selector)
            if not nodes:
                continue
            text = " ".join(node.get_text(" ", strip=True) for node in nodes)
            if len(text) >= 200:
                return text[:20000]

        paragraphs = [p.get_text(" ", strip=True) for p in soup.select("p")]
        body = " ".join([p for p in paragraphs if len(p) > 30])
        return body[:20000]

    @staticmethod
    def _is_ai_relevant(title: str, body: str) -> bool:
        full = f"{title}\n{body}".lower()
        strong_hits = GDELTNewsCrawler._keyword_hit_count(full, AI_STRONG_KEYWORDS)
        weak_hits = GDELTNewsCrawler._keyword_hit_count(full, AI_WEAK_KEYWORDS)

        if strong_hits >= 2:
            return True
        if strong_hits >= 1 and weak_hits >= 1:
            return True
        return False

    @staticmethod
    def _keyword_hit_count(text: str, keywords: list[str]) -> int:
        hits = 0
        for kw in keywords:
            pattern = r"\b" + r"\s+".join(re.escape(part) for part in kw.split()) + r"\b"
            if re.search(pattern, text):
                hits += 1
        return hits

    def _request_with_retry(self, params: dict[str, str]) -> httpx.Response | str:
        max_attempts = 3
        for attempt in range(1, max_attempts + 1):
            try:
                resp = self.client.get(GDELT_DOC_API, params=params)
            except Exception as exc:  # noqa: BLE001
                if attempt == max_attempts:
                    return f"GDELT request failed: {exc}"
                time.sleep(2)
                continue

            if resp.status_code != 429:
                return resp

            if attempt == max_attempts:
                return "GDELT rate limited (HTTP 429). Retry after a delay."

            retry_after = resp.headers.get("Retry-After", "").strip()
            try:
                wait_sec = max(1, int(retry_after))
            except ValueError:
                wait_sec = 5
            time.sleep(wait_sec)

        return "GDELT request failed: retry loop ended unexpectedly"

    @staticmethod
    def _build_params(
        query: str,
        max_articles: int,
        window_minutes: int,
        language: str | None,
    ) -> dict[str, str]:
        params: dict[str, str] = {
            "query": query,
            "mode": "ArtList",
            "format": "json",
            "sort": "DateDesc",
            "timespan": f"{window_minutes}min",
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
