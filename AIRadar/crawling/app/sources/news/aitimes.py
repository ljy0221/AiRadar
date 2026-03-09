from __future__ import annotations

import re
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Iterable
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

from app.config import settings
from app.storage.raw_archive import S3RawArchiveScaffold

AITIMES_DOMAIN = "https://www.aitimes.com"
ARTICLE_LINK_TOKEN = "/news/articleView.html?idxno="

TARGET_URLS = {
    "ai_industry": "https://www.aitimes.com/news/articleList.html?sc_multi_code=S2&view_type=sm",
    "ai_company": "https://www.aitimes.com/news/articleList.html?sc_sub_section_code=S2N51&view_type=sm",
}

DATE_PATTERN = re.compile(r"(\d{4}[.\-/]\d{2}[.\-/]\d{2}(?:\s+\d{2}:\d{2})?)")


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


class AITimesCrawler:
    def __init__(self) -> None:
        self.archive = S3RawArchiveScaffold()
        self.client = httpx.Client(
            timeout=settings.request_timeout_sec,
            headers={"User-Agent": settings.user_agent},
            follow_redirects=True,
        )

    def close(self) -> None:
        self.client.close()

    def crawl(
        self,
        targets: list[str],
        max_pages_per_target: int,
        max_articles: int,
    ) -> tuple[list[ParsedArticle], list[str], int, int]:
        selected_targets = targets or ["ai_industry", "ai_company"]
        urls: list[tuple[str, str]] = []
        errors: list[str] = []

        for target in selected_targets:
            list_url = TARGET_URLS.get(target)
            if not list_url:
                errors.append(f"Unsupported target: {target}")
                continue

            urls.extend(
                self._collect_article_urls(
                    target=target,
                    list_url=list_url,
                    max_pages=max_pages_per_target,
                )
            )

        unique_urls: list[tuple[str, str]] = []
        seen_urls: set[str] = set()
        duplicate_count = 0

        for target, url in urls:
            if url in seen_urls:
                duplicate_count += 1
                continue
            seen_urls.add(url)
            unique_urls.append((target, url))

        if len(unique_urls) > max_articles:
            unique_urls = unique_urls[:max_articles]

        parsed: list[ParsedArticle] = []
        failed_count = 0
        for target, url in unique_urls:
            try:
                parsed.append(self._crawl_article(target=target, url=url))
            except Exception as exc:  # noqa: BLE001
                failed_count += 1
                errors.append(f"{url} -> {exc}")

        return parsed, errors, duplicate_count, failed_count

    def _collect_article_urls(
        self,
        target: str,
        list_url: str,
        max_pages: int,
    ) -> list[tuple[str, str]]:
        collected: list[tuple[str, str]] = []
        for page in range(1, max_pages + 1):
            page_url = f"{list_url}&page={page}"
            resp = self.client.get(page_url)
            resp.raise_for_status()

            for link in self._extract_article_links(resp.text):
                if "/admin/" in link:
                    continue
                collected.append((target, link))

            time.sleep(settings.request_delay_sec)

        return collected

    def _extract_article_links(self, html: str) -> Iterable[str]:
        soup = BeautifulSoup(html, "html.parser")
        for anchor in soup.select("a[href]"):
            href = anchor.get("href", "").strip()
            if ARTICLE_LINK_TOKEN not in href:
                continue
            yield urljoin(AITIMES_DOMAIN, href)

    def _crawl_article(self, target: str, url: str) -> ParsedArticle:
        if not self._is_allowed_url(url):
            raise ValueError("URL blocked by robots rule (/admin/)")

        resp = self.client.get(url)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")

        title = self._extract_title(soup)
        body = self._extract_body(soup)
        author = self._extract_author(soup)
        published_at = self._extract_published_at(soup)

        raw = self.archive.save_html(
            source="news/aitimes",
            target=target,
            url=url,
            html=resp.text,
        )

        time.sleep(settings.request_delay_sec)
        return ParsedArticle(
            source="news",
            target=target,
            url=url,
            title=title,
            author=author,
            published_at=published_at,
            body=body,
            raw_key=raw.key,
            raw_saved=raw.saved,
            raw_reason=raw.reason,
        )

    def _is_allowed_url(self, url: str) -> bool:
        parsed = urlparse(url)
        return parsed.netloc == "www.aitimes.com" and not parsed.path.startswith("/admin/")

    @staticmethod
    def _first_text(soup: BeautifulSoup, selectors: list[str]) -> str | None:
        for selector in selectors:
            node = soup.select_one(selector)
            if not node:
                continue
            text = node.get_text(" ", strip=True)
            if text:
                return text
        return None

    def _extract_title(self, soup: BeautifulSoup) -> str:
        title = self._first_text(
            soup,
            [
                "h3#article-title",
                "h1#article-title",
                "h1.article-title",
                "h2.article-title",
            ],
        )
        if title:
            return title

        og_title = soup.select_one('meta[property="og:title"]')
        if og_title and og_title.get("content"):
            return og_title["content"].strip()
        return "Untitled"

    def _extract_body(self, soup: BeautifulSoup) -> str:
        body = self._first_text(
            soup,
            [
                "#article-view-content-div",
                ".article-view-content-div",
                ".view-content",
                "article",
                "#articleBody",
            ],
        )
        if body:
            return body
        return ""

    def _extract_author(self, soup: BeautifulSoup) -> str | None:
        return self._first_text(
            soup,
            [
                ".byline em",
                ".article-byline em",
                ".writer",
                ".article-head .name",
            ],
        )

    def _extract_published_at(self, soup: BeautifulSoup) -> str | None:
        dt = self._first_text(
            soup,
            [
                ".article-head .updated",
                ".article-head .date",
                ".byline .updated",
                "time",
            ],
        )
        if dt:
            match = DATE_PATTERN.search(dt)
            if match:
                return match.group(1)

        for meta_name in ["article:published_time", "pubdate"]:
            node = soup.select_one(f'meta[property="{meta_name}"], meta[name="{meta_name}"]')
            if node and node.get("content"):
                return node["content"].strip()

        return datetime.now(timezone.utc).isoformat()
