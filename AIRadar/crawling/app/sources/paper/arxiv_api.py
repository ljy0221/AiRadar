from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from hashlib import sha1
import time
from urllib.parse import urlencode
from xml.etree import ElementTree

import httpx

from app.config import settings

ARXIV_API_ENDPOINT = "https://export.arxiv.org/api/query"
DEFAULT_SEARCH_QUERY = "cat:cs.AI"
MAX_PAGE_SIZE = 100

ATOM_NS = {"atom": "http://www.w3.org/2005/Atom", "arxiv": "http://arxiv.org/schemas/atom"}


@dataclass
class ParsedPaper:
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
    extra: dict[str, object] = field(default_factory=dict)


class ArxivApiCrawler:
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
        query_override: str | None = None,
    ) -> tuple[list[ParsedPaper], list[str], int, int]:
        query = query_override.strip() if query_override else DEFAULT_SEARCH_QUERY

        errors: list[str] = []
        papers: list[ParsedPaper] = []
        seen_urls: set[str] = set()
        duplicate_count = 0
        failed_count = 0
        start = 0

        while len(papers) < max_articles:
            batch_size = min(MAX_PAGE_SIZE, max_articles - len(papers))
            params = {
                "search_query": query,
                "start": str(start),
                "max_results": str(batch_size),
                "sortBy": "submittedDate",
                "sortOrder": "descending",
            }

            resp = self.client.get(ARXIV_API_ENDPOINT, params=params)
            if resp.status_code >= 400:
                body = resp.text[:180].replace("\n", " ").strip()
                errors.append(f"arXiv API error {resp.status_code}: {body}")
                break

            try:
                entries = self._parse_entries(resp.text)
            except Exception as exc:  # noqa: BLE001
                failed_count += 1
                errors.append(f"arXiv XML parse failed: {exc}")
                break

            if not entries:
                break

            for entry in entries:
                try:
                    parsed = self._to_parsed_paper(entry=entry, search_query=query)
                    if parsed.url in seen_urls:
                        duplicate_count += 1
                        continue

                    seen_urls.add(parsed.url)
                    papers.append(parsed)
                    if len(papers) >= max_articles:
                        break
                except Exception as exc:  # noqa: BLE001
                    failed_count += 1
                    errors.append(f"arXiv entry parse failed: {exc}")

            start += batch_size
            time.sleep(settings.request_delay_sec)

        return papers, errors, duplicate_count, failed_count

    def _parse_entries(self, xml_text: str) -> list[ElementTree.Element]:
        root = ElementTree.fromstring(xml_text)
        return root.findall("atom:entry", ATOM_NS)

    def _to_parsed_paper(self, entry: ElementTree.Element, search_query: str) -> ParsedPaper:
        url = (entry.findtext("atom:id", default="", namespaces=ATOM_NS) or "").strip()
        title = self._normalize_text(entry.findtext("atom:title", default="", namespaces=ATOM_NS))
        summary = self._normalize_text(entry.findtext("atom:summary", default="", namespaces=ATOM_NS))
        published = (entry.findtext("atom:published", default="", namespaces=ATOM_NS) or "").strip() or None
        updated = (entry.findtext("atom:updated", default="", namespaces=ATOM_NS) or "").strip() or None

        author_nodes = entry.findall("atom:author", ATOM_NS)
        author_names = [
            self._normalize_text(node.findtext("atom:name", default="", namespaces=ATOM_NS))
            for node in author_nodes
        ]
        author_names = [name for name in author_names if name]

        category_nodes = entry.findall("atom:category", ATOM_NS)
        categories = [
            (node.get("term") or "").strip()
            for node in category_nodes
            if (node.get("term") or "").strip()
        ]
        primary_category_node = entry.find("arxiv:primary_category", ATOM_NS)
        primary_category = (primary_category_node.get("term") or "").strip() if primary_category_node is not None else ""

        pdf_url = self._extract_pdf_url(entry)
        body = summary or title or "No summary"
        author = ", ".join(author_names) if author_names else None
        if not url:
            raise ValueError("missing id URL")

        return ParsedPaper(
            source="paper",
            target="cs_ai",
            url=url,
            title=title or "Untitled",
            author=author,
            published_at=published,
            body=body,
            raw_key=self._build_raw_key(url),
            raw_saved=False,
            raw_reason="Storage skipped for arxiv_api provider (Kafka handoff planned)",
            extra={
                "updated_at": updated,
                "pdf_url": pdf_url,
                "categories": categories,
                "primary_category": primary_category,
                "search_query": search_query,
            },
        )

    @staticmethod
    def _extract_pdf_url(entry: ElementTree.Element) -> str | None:
        for link_node in entry.findall("atom:link", ATOM_NS):
            title = (link_node.get("title") or "").strip().lower()
            if title == "pdf":
                href = (link_node.get("href") or "").strip()
                return href or None
        return None

    @staticmethod
    def _normalize_text(value: str | None) -> str:
        if not value:
            return ""
        return " ".join(value.split())

    @staticmethod
    def _build_raw_key(url: str) -> str:
        now = datetime.now(timezone.utc)
        digest = sha1(url.encode("utf-8")).hexdigest()
        return (
            f"raw/paper/arxiv_api/cs_ai/"
            f"{now.year:04d}/{now.month:02d}/{now.day:02d}/{digest}.json"
        )

    @staticmethod
    def build_debug_query_url(search_query: str, start: int, max_results: int) -> str:
        params = {
            "search_query": search_query,
            "start": str(start),
            "max_results": str(max_results),
            "sortBy": "submittedDate",
            "sortOrder": "descending",
        }
        return f"{ARXIV_API_ENDPOINT}?{urlencode(params)}"

