from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from hashlib import sha1
import re

from bs4 import BeautifulSoup
import httpx

from app.config import settings

GITHUB_TRENDING_URL = "https://github.com/trending"
NUMBER_PATTERN = re.compile(r"[0-9][0-9,]*")


@dataclass
class ParsedGithubArchiveItem:
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


class GithubTrendingArchiveCrawler:
    def __init__(self) -> None:
        self.client = httpx.Client(
            timeout=settings.request_timeout_sec,
            headers={
                "User-Agent": settings.user_agent,
                "Accept": "text/html,application/xhtml+xml",
            },
            follow_redirects=True,
        )

    def close(self) -> None:
        self.client.close()

    def crawl(
        self,
        max_articles: int,
        window_minutes: int,
        top_n: int,
        min_stars: int,
    ) -> tuple[list[ParsedGithubArchiveItem], list[str], int, int]:
        now_utc = datetime.now(timezone.utc)
        start_utc = now_utc - timedelta(minutes=window_minutes)
        errors: list[str] = []

        parsed = self._fetch_trending_page()
        if isinstance(parsed, str):
            return [], [parsed], 0, 1

        items: list[ParsedGithubArchiveItem] = []
        seen_urls: set[str] = set()
        duplicate_count = 0
        failed_count = 0

        for rank, repo in enumerate(parsed, start=1):
            if rank > top_n or len(items) >= max_articles:
                break

            stars = int(repo.get("stars") or 0)
            if stars < min_stars:
                continue

            repo_item = self._build_repo_item(
                repo=repo,
                rank=rank,
                window_start=start_utc,
                window_end=now_utc,
            )
            if repo_item.url in seen_urls:
                duplicate_count += 1
                continue
            seen_urls.add(repo_item.url)
            items.append(repo_item)

        if not items:
            errors.append(
                "No repositories matched the GitHub Trending page filters. Try lowering github_min_stars."
            )

        return items, errors, duplicate_count, failed_count

    def _fetch_trending_page(self) -> list[dict[str, object]] | str:
        resp = self.client.get(
            GITHUB_TRENDING_URL,
            params={"since": "daily"},
        )
        if resp.status_code >= 400:
            body = resp.text[:200].replace("\n", " ").strip()
            return f"GitHub Trending page error {resp.status_code}: {body}"

        soup = BeautifulSoup(resp.text, "html.parser")
        articles = soup.select("article.Box-row")
        if not articles:
            return "GitHub Trending page returned no repository rows"

        repos: list[dict[str, object]] = []
        for article in articles:
            link = article.select_one("h2 a[href]")
            if link is None:
                continue

            href = (link.get("href") or "").strip()
            full_name = href.strip("/").replace(" ", "")
            if not full_name or "/" not in full_name:
                continue

            description_node = article.select_one("p")
            language_node = article.select_one('[itemprop="programmingLanguage"]')
            stars_link = article.select_one(f'a[href="/{full_name}/stargazers"]')
            forks_link = article.select_one(f'a[href="/{full_name}/forks"]')
            stars_today_node = article.select_one("span.float-sm-right")

            repos.append(
                {
                    "full_name": full_name,
                    "html_url": f"https://github.com/{full_name}",
                    "description": description_node.get_text(" ", strip=True) if description_node else "",
                    "language": language_node.get_text(" ", strip=True) if language_node else None,
                    "stars": self._parse_number(stars_link.get_text(" ", strip=True) if stars_link else None),
                    "forks": self._parse_number(forks_link.get_text(" ", strip=True) if forks_link else None),
                    "stars_today": self._parse_number(
                        stars_today_node.get_text(" ", strip=True) if stars_today_node else None
                    ),
                    "topics": [],
                }
            )

        if not repos:
            return "GitHub Trending page parsing failed to extract repository metadata"
        return repos

    def _build_repo_item(
        self,
        repo: dict[str, object],
        rank: int,
        window_start: datetime,
        window_end: datetime,
    ) -> ParsedGithubArchiveItem:
        repo_name = str(repo.get("full_name") or "unknown/unknown").strip()
        html_url = str(repo.get("html_url") or "").strip()
        owner = repo_name.split("/", 1)[0] if "/" in repo_name else None
        description = str(repo.get("description") or "").strip()
        stars = int(repo.get("stars") or 0)
        forks = int(repo.get("forks") or 0)
        stars_today = int(repo.get("stars_today") or 0)

        return ParsedGithubArchiveItem(
            source="github_archive",
            target="trending_repo",
            url=html_url,
            title=repo_name,
            author=owner,
            published_at=None,
            body=description,
            raw_key=self._build_raw_key(url=html_url, target="trending_repo"),
            raw_saved=False,
            raw_reason="Storage skipped for github_trending_archive provider (GitHub Trending web handoff planned)",
            extra={
                "trend_rank": rank,
                "window_start": window_start.isoformat(),
                "window_end": window_end.isoformat(),
                "stars": stars,
                "forks": forks,
                "watchers": stars,
                "open_issues": None,
                "language": repo.get("language"),
                "topics": repo.get("topics") or [],
                "full_name": repo_name,
                "readme_excerpt": None,
                "license": None,
                "created_at": None,
                "updated_at": None,
                "pushed_at": None,
                "recent_activity_basis": "github_trending_web",
                "recent_activity_sort": "github_trending_rank",
                "stars_today": stars_today,
            },
        )

    @staticmethod
    def _parse_number(text: str | None) -> int:
        if not text:
            return 0
        match = NUMBER_PATTERN.search(text)
        if match is None:
            return 0
        return int(match.group(0).replace(",", ""))

    @staticmethod
    def _build_raw_key(url: str, target: str) -> str:
        now = datetime.now(timezone.utc)
        digest = sha1(url.encode("utf-8")).hexdigest()
        return (
            f"raw/github_archive/github_trending_archive/{target}/"
            f"{now.year:04d}/{now.month:02d}/{now.day:02d}/{digest}.json"
        )
