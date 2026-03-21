from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from hashlib import sha1

import httpx

from app.config import settings

GITHUB_SEARCH_REPOS_API = "https://api.github.com/search/repositories"
AI_TRENDING_QUERY = "ai OR llm"


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
        headers = {
            "User-Agent": settings.user_agent,
            "Accept": "application/vnd.github+json",
        }
        if settings.github_token:
            headers["Authorization"] = f"Bearer {settings.github_token}"

        self.client = httpx.Client(
            timeout=settings.request_timeout_sec,
            headers=headers,
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
        failed_count = 0

        if not settings.github_token:
            errors.append(
                "GITHUB_TOKEN is not configured. GitHub Search API can work without it, but production use on EC2 is likely to hit low rate limits."
            )

        result = self._search_trending_repositories(
            start_utc=start_utc,
            top_n=top_n,
            min_stars=min_stars,
        )
        if isinstance(result, str):
            return [], [result, *errors], 0, 1

        items: list[ParsedGithubArchiveItem] = []
        seen_urls: set[str] = set()
        duplicate_count = 0

        for rank, repo in enumerate(result, start=1):
            if len(items) >= max_articles:
                break

            repo_name = str(repo.get("full_name") or "").strip()
            html_url = str(repo.get("html_url") or "").strip()
            if not repo_name or not html_url:
                failed_count += 1
                errors.append("GitHub Search API returned a repository without full_name/html_url")
                continue

            item = self._build_repo_item(
                repo=repo,
                rank=rank,
                window_start=start_utc,
                window_end=now_utc,
            )
            if item.url in seen_urls:
                duplicate_count += 1
                continue
            seen_urls.add(item.url)
            items.append(item)

        if not items:
            errors.append(
                "No repositories matched the GitHub Search API filters. Try lowering github_min_stars or widening github_window_minutes."
            )

        return items, errors, duplicate_count, failed_count

    def _search_trending_repositories(
        self,
        start_utc: datetime,
        top_n: int,
        min_stars: int,
    ) -> list[dict[str, object]] | str:
        pushed_since = start_utc.date().isoformat()
        params = {
            "q": f"({AI_TRENDING_QUERY}) stars:>={max(0, min_stars)} pushed:>={pushed_since} archived:false",
            "sort": "updated",
            "order": "desc",
            "per_page": str(max(1, min(100, top_n))),
            "page": "1",
        }

        resp = self.client.get(GITHUB_SEARCH_REPOS_API, params=params)
        if resp.status_code >= 400:
            body = resp.text[:200].replace("\n", " ").strip()
            return f"GitHub Search API error {resp.status_code}: {body}"

        payload = resp.json()
        repos = payload.get("items") or []
        if not isinstance(repos, list):
            return "GitHub Search API returned an unexpected payload for trending repositories"

        filtered: list[dict[str, object]] = []
        for repo in repos:
            if not isinstance(repo, dict):
                continue
            if int(repo.get("stargazers_count") or 0) < min_stars:
                continue
            filtered.append(repo)

        return filtered[: max(1, top_n)]

    def _build_repo_item(
        self,
        repo: dict[str, object],
        rank: int,
        window_start: datetime,
        window_end: datetime,
    ) -> ParsedGithubArchiveItem:
        repo_name = str(repo.get("full_name") or "unknown/unknown").strip()
        html_url = str(repo.get("html_url") or "").strip()
        owner = ((repo.get("owner") or {}).get("login") or "").strip() or None
        description = str(repo.get("description") or "").strip()
        topics = repo.get("topics") or []
        if not isinstance(topics, list):
            topics = []

        return ParsedGithubArchiveItem(
            source="github_archive",
            target="trending_repo",
            url=html_url,
            title=repo_name,
            author=owner,
            published_at=(repo.get("updated_at") or repo.get("pushed_at") or None),
            body=description,
            raw_key=self._build_raw_key(url=html_url, target="trending_repo"),
            raw_saved=False,
            raw_reason="Storage skipped for github_trending_archive provider (GitHub Search API handoff planned)",
            extra={
                "trend_rank": rank,
                "window_start": window_start.isoformat(),
                "window_end": window_end.isoformat(),
                "stars": int(repo.get("stargazers_count") or 0),
                "forks": int(repo.get("forks_count") or 0),
                "watchers": int(repo.get("watchers_count") or 0),
                "open_issues": int(repo.get("open_issues_count") or 0),
                "language": repo.get("language"),
                "topics": topics,
                "full_name": repo_name,
                "readme_excerpt": None,
                "license": ((repo.get("license") or {}).get("spdx_id") or None),
                "created_at": repo.get("created_at"),
                "updated_at": repo.get("updated_at"),
                "pushed_at": repo.get("pushed_at"),
                "recent_activity_basis": "github_search_repositories",
                "recent_activity_sort": "updated_desc",
                "stars_today": None,
            },
        )

    @staticmethod
    def _build_raw_key(url: str, target: str) -> str:
        now = datetime.now(timezone.utc)
        digest = sha1(url.encode("utf-8")).hexdigest()
        return (
            f"raw/github_archive/github_trending_archive/{target}/"
            f"{now.year:04d}/{now.month:02d}/{now.day:02d}/{digest}.json"
        )
