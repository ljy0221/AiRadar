from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from hashlib import sha1
import gzip
import io
import json

import httpx

from app.config import settings

GH_ARCHIVE_URL_TEMPLATE = "https://data.gharchive.org/{date}-{hour}.json.gz"
GITHUB_REPO_API = "https://api.github.com/repos/{full_name}"
GITHUB_PULLS_API = "https://api.github.com/repos/{full_name}/pulls"


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
        window_hours: int,
        top_n: int,
        pr_per_repo: int,
    ) -> tuple[list[ParsedGithubArchiveItem], list[str], int, int]:
        now_utc = datetime.now(timezone.utc)
        start_utc = now_utc - timedelta(hours=window_hours)

        watch_counts: dict[str, int] = {}
        fork_counts: dict[str, int] = {}
        errors: list[str] = []
        failed_count = 0

        file_hours = self._hour_windows(start_utc=start_utc, end_utc=now_utc)
        for hour_dt in file_hours:
            date_part = hour_dt.strftime("%Y-%m-%d")
            hour_part = hour_dt.hour
            url = GH_ARCHIVE_URL_TEMPLATE.format(date=date_part, hour=hour_part)

            try:
                resp = self.client.get(url)
            except Exception as exc:  # noqa: BLE001
                errors.append(f"GH Archive request failed {url}: {exc}")
                failed_count += 1
                continue

            if resp.status_code == 404:
                continue
            if resp.status_code >= 400:
                errors.append(f"GH Archive HTTP {resp.status_code}: {url}")
                failed_count += 1
                continue

            try:
                with gzip.GzipFile(fileobj=io.BytesIO(resp.content)) as gz:
                    for raw_line in gz:
                        try:
                            event = json.loads(raw_line)
                        except Exception:
                            continue

                        created_at = self._parse_iso8601(event.get("created_at"))
                        if created_at is None or created_at < start_utc or created_at > now_utc:
                            continue

                        event_type = event.get("type")
                        repo_name = ((event.get("repo") or {}).get("name") or "").strip()
                        if not repo_name:
                            continue

                        if event_type == "WatchEvent":
                            watch_counts[repo_name] = watch_counts.get(repo_name, 0) + 1
                        elif event_type == "ForkEvent":
                            fork_counts[repo_name] = fork_counts.get(repo_name, 0) + 1
            except Exception as exc:  # noqa: BLE001
                errors.append(f"GH Archive parse failed {url}: {exc}")
                failed_count += 1

        ranked = self._rank_repositories(watch_counts=watch_counts, fork_counts=fork_counts)
        selected = ranked[: max(1, top_n)]

        items: list[ParsedGithubArchiveItem] = []
        seen_urls: set[str] = set()
        duplicate_count = 0

        for repo_name, watch_delta, fork_delta, trend_score in selected:
            if len(items) >= max_articles:
                break

            repo_item = self._fetch_repo_metadata(
                repo_name=repo_name,
                watch_delta=watch_delta,
                fork_delta=fork_delta,
                trend_score=trend_score,
                window_start=start_utc,
                window_end=now_utc,
            )
            if isinstance(repo_item, str):
                errors.append(repo_item)
                failed_count += 1
                continue

            if repo_item.url in seen_urls:
                duplicate_count += 1
            else:
                seen_urls.add(repo_item.url)
                items.append(repo_item)

            pr_docs = self._fetch_pr_documents(
                repo_name=repo_name,
                trend_score=trend_score,
                start_utc=start_utc,
                end_utc=now_utc,
                pr_per_repo=pr_per_repo,
            )
            for pr_doc in pr_docs:
                if len(items) >= max_articles:
                    break
                if pr_doc.url in seen_urls:
                    duplicate_count += 1
                    continue
                seen_urls.add(pr_doc.url)
                items.append(pr_doc)

        return items, errors, duplicate_count, failed_count

    def _fetch_repo_metadata(
        self,
        repo_name: str,
        watch_delta: int,
        fork_delta: int,
        trend_score: int,
        window_start: datetime,
        window_end: datetime,
    ) -> ParsedGithubArchiveItem | str:
        url = GITHUB_REPO_API.format(full_name=repo_name)
        resp = self.client.get(url)
        if resp.status_code >= 400:
            return f"GitHub repo API {resp.status_code}: {repo_name}"

        data = resp.json()
        html_url = (data.get("html_url") or "").strip()
        if not html_url:
            return f"GitHub repo API missing html_url: {repo_name}"

        owner = ((data.get("owner") or {}).get("login") or "").strip() or None
        description = (data.get("description") or "").strip()
        pushed_at = (data.get("pushed_at") or "").strip() or None
        topics = data.get("topics") or []
        if not isinstance(topics, list):
            topics = []

        return ParsedGithubArchiveItem(
            source="github_archive",
            target="trending_repo",
            url=html_url,
            title=repo_name,
            author=owner,
            published_at=pushed_at,
            body=description,
            raw_key=self._build_raw_key(url=html_url, target="trending_repo"),
            raw_saved=False,
            raw_reason="Storage skipped for github_trending_archive provider (Kafka handoff planned)",
            extra={
                "trend_score": trend_score,
                "today_watch_delta": watch_delta,
                "today_fork_delta": fork_delta,
                "trend_formula": "watch_delta*3 + fork_delta*4",
                "window_start": window_start.isoformat(),
                "window_end": window_end.isoformat(),
                "stars": int(data.get("stargazers_count") or 0),
                "forks": int(data.get("forks_count") or 0),
                "watchers": int(data.get("watchers_count") or 0),
                "open_issues": int(data.get("open_issues_count") or 0),
                "language": data.get("language"),
                "topics": topics,
                "full_name": repo_name,
                "readme_excerpt": None,
                "license": ((data.get("license") or {}).get("spdx_id") or None),
                "created_at": data.get("created_at"),
                "updated_at": data.get("updated_at"),
                "pushed_at": data.get("pushed_at"),
            },
        )

    def _fetch_pr_documents(
        self,
        repo_name: str,
        trend_score: int,
        start_utc: datetime,
        end_utc: datetime,
        pr_per_repo: int,
    ) -> list[ParsedGithubArchiveItem]:
        url = GITHUB_PULLS_API.format(full_name=repo_name)
        resp = self.client.get(
            url,
            params={
                "state": "all",
                "sort": "created",
                "direction": "desc",
                "per_page": "50",
                "page": "1",
            },
        )
        if resp.status_code >= 400:
            return []

        docs: list[ParsedGithubArchiveItem] = []
        for pr in resp.json():
            created_at = self._parse_iso8601(pr.get("created_at"))
            if created_at is None:
                continue
            if created_at < start_utc:
                break
            if created_at > end_utc:
                continue

            pr_url = (pr.get("html_url") or "").strip()
            if not pr_url:
                continue

            pr_number = pr.get("number")
            title = (pr.get("title") or "").strip() or f"PR #{pr_number}"
            body = (pr.get("body") or "").strip()
            author = ((pr.get("user") or {}).get("login") or "").strip() or None

            docs.append(
                ParsedGithubArchiveItem(
                    source="github_archive",
                    target="repo_pr_document",
                    url=pr_url,
                    title=title,
                    author=author,
                    published_at=pr.get("created_at"),
                    body=body,
                    raw_key=self._build_raw_key(url=pr_url, target="repo_pr_document"),
                    raw_saved=False,
                    raw_reason="Storage skipped for github_trending_archive provider (Kafka handoff planned)",
                    extra={
                        "repo_full_name": repo_name,
                        "pr_number": pr_number,
                        "pr_state": pr.get("state"),
                        "pr_created_at": pr.get("created_at"),
                        "pr_updated_at": pr.get("updated_at"),
                        "trend_score": trend_score,
                    },
                )
            )
            if len(docs) >= pr_per_repo:
                break

        return docs

    @staticmethod
    def _rank_repositories(
        watch_counts: dict[str, int],
        fork_counts: dict[str, int],
    ) -> list[tuple[str, int, int, int]]:
        rows: list[tuple[str, int, int, int]] = []
        for repo_name in set(watch_counts.keys()) | set(fork_counts.keys()):
            watch_delta = watch_counts.get(repo_name, 0)
            fork_delta = fork_counts.get(repo_name, 0)
            trend_score = watch_delta * 3 + fork_delta * 4
            if trend_score <= 0:
                continue
            rows.append((repo_name, watch_delta, fork_delta, trend_score))

        rows.sort(key=lambda row: (row[3], row[2], row[1]), reverse=True)
        return rows

    @staticmethod
    def _hour_windows(start_utc: datetime, end_utc: datetime) -> list[datetime]:
        current = start_utc.replace(minute=0, second=0, microsecond=0)
        last = end_utc.replace(minute=0, second=0, microsecond=0)
        out: list[datetime] = []
        while current <= last:
            out.append(current)
            current += timedelta(hours=1)
        return out

    @staticmethod
    def _parse_iso8601(text: str | None) -> datetime | None:
        if not text:
            return None
        normalized = text.strip()
        if not normalized:
            return None
        if normalized.endswith("Z"):
            normalized = normalized[:-1] + "+00:00"
        try:
            dt = datetime.fromisoformat(normalized)
        except ValueError:
            return None
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)

    @staticmethod
    def _build_raw_key(url: str, target: str) -> str:
        now = datetime.now(timezone.utc)
        digest = sha1(url.encode("utf-8")).hexdigest()
        return (
            f"raw/github_archive/github_trending_archive/{target}/"
            f"{now.year:04d}/{now.month:02d}/{now.day:02d}/{digest}.json"
        )
