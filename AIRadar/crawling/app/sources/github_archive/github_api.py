from __future__ import annotations

import base64
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from hashlib import sha1
import re

import httpx

from app.config import settings

GITHUB_SEARCH_REPOS_API = "https://api.github.com/search/repositories"
GITHUB_REPO_README_API = "https://api.github.com/repos/{full_name}/readme"
GITHUB_REPO_COMMITS_API = "https://api.github.com/repos/{full_name}/commits"
DEFAULT_AI_REPO_QUERIES = [
    "topic:artificial-intelligence",
    "topic:machine-learning",
    "topic:deep-learning",
    "llm in:name,description,readme",
]
README_FETCH_LIMIT = 20
README_MAX_CHARS = 12000
AI_TOPIC_KEYWORDS = {
    "artificial-intelligence",
    "machine-learning",
    "deep-learning",
    "llm",
    "nlp",
    "computer-vision",
    "generative-ai",
    "ai",
}
EXCLUDE_TOPIC_KEYWORDS = {
    "homework",
    "study",
    "studying",
    "tutorial",
    "course",
    "assignment",
    "bootcamp",
    "lecture",
    "awesome-list",
}
MIN_AI_TEXT_KEYWORDS = [
    "artificial intelligence",
    "machine learning",
    "deep learning",
    "generative ai",
    "llm",
    "gpt",
    "ai",
]
EXCLUDE_TEXT_KEYWORDS = [
    "homework",
    "study project",
    "study notes",
    "tutorial",
    "for beginners",
    "course material",
    "assignment",
    "bootcamp",
    "lecture note",
]


@dataclass
class ParsedRepo:
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


class GithubArchiveCrawler:
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
        query_override: str | None,
        min_stars: int,
        created_since_days: int,
        sort: str,
        order: str,
        include_readme: bool,
    ) -> tuple[list[ParsedRepo], list[str], int, int]:
        pushed_since = (datetime.now(timezone.utc) - timedelta(days=created_since_days)).date().isoformat()
        base_queries = [query_override.strip()] if query_override else DEFAULT_AI_REPO_QUERIES

        results: list[ParsedRepo] = []
        seen: set[str] = set()
        duplicate_count = 0
        failed_count = 0
        filtered_out_count = 0
        excluded_count = 0
        errors: list[str] = []

        per_query_page_size = max(10, min(100, max_articles))
        readme_remaining = README_FETCH_LIMIT if include_readme else 0
        for base_query in base_queries:
            merged_query = f"{base_query} stars:>={min_stars} pushed:>={pushed_since}"
            params = {
                "q": merged_query,
                "sort": sort,
                "order": order,
                "per_page": str(per_query_page_size),
                "page": "1",
            }

            resp = self.client.get(GITHUB_SEARCH_REPOS_API, params=params)
            if resp.status_code >= 400:
                body = resp.text[:200].replace("\n", " ").strip()
                errors.append(f"GitHub API error {resp.status_code}: {body}")
                continue

            payload = resp.json()
            repos = payload.get("items", [])

            for repo in repos:
                try:
                    url = (repo.get("html_url") or "").strip()
                    if not url:
                        failed_count += 1
                        continue

                    if url in seen:
                        duplicate_count += 1
                        continue
                    seen.add(url)

                    full_name = (repo.get("full_name") or "").strip() or "unknown/unknown"
                    owner = (repo.get("owner") or {}).get("login")
                    description = (repo.get("description") or "").strip()
                    pushed_at = (repo.get("pushed_at") or "").strip() or None
                    license_name = ((repo.get("license") or {}).get("spdx_id") or "").strip() or None
                    topics = repo.get("topics") or []
                    if not isinstance(topics, list):
                        topics = []

                    if self._is_excluded_repo(full_name=full_name, description=description, topics=topics):
                        excluded_count += 1
                        continue

                    if not self._is_min_ai_match(full_name=full_name, description=description, topics=topics):
                        filtered_out_count += 1
                        continue

                    stars = int(repo.get("stargazers_count") or 0)
                    forks = int(repo.get("forks_count") or 0)
                    watchers = int(repo.get("watchers_count") or 0)
                    open_issues = int(repo.get("open_issues_count") or 0)
                    readme_excerpt = ""
                    readme_truncated = False
                    readme_error: str | None = None
                    recent_commit_messages: list[dict[str, str | None]] = []
                    commit_messages_error: str | None = None

                    if include_readme and readme_remaining > 0:
                        readme_excerpt, readme_truncated, readme_error = self._fetch_readme_excerpt(
                            full_name=full_name,
                            max_chars=README_MAX_CHARS,
                        )
                        readme_remaining -= 1

                    recent_commit_messages, commit_messages_error = self._fetch_all_commit_messages(
                        full_name=full_name,
                    )

                    key = self._build_raw_key(url)
                    results.append(
                        ParsedRepo(
                            source="github_archive",
                            target="ai_repositories",
                            url=url,
                            title=full_name,
                            author=owner,
                            published_at=pushed_at,
                            body=description,
                            raw_key=key,
                            raw_saved=False,
                            raw_reason="S3 save skipped for github_archive provider",
                            extra={
                                "full_name": full_name,
                                "stars": stars,
                                "forks": forks,
                                "watchers": watchers,
                                "open_issues": open_issues,
                                "language": repo.get("language"),
                                "topics": topics,
                                "license": license_name,
                                "default_branch": repo.get("default_branch"),
                                "created_at": repo.get("created_at"),
                                "updated_at": repo.get("updated_at"),
                                "pushed_at": repo.get("pushed_at"),
                                "size_kb": repo.get("size"),
                                "archived": bool(repo.get("archived")),
                                "disabled": bool(repo.get("disabled")),
                                "readme_excerpt": readme_excerpt,
                                "readme_truncated": readme_truncated,
                                "readme_error": readme_error,
                                "recent_commit_messages": recent_commit_messages,
                                "commit_messages_error": commit_messages_error,
                            },
                        )
                    )
                    if len(results) >= max_articles:
                        break
                except Exception as exc:  # noqa: BLE001
                    failed_count += 1
                    errors.append(f"repo parse failed: {exc}")
            if len(results) >= max_articles:
                break

        if not results:
            errors.append("No repositories matched current filters. Try lowering github_min_stars or widening github_created_since_days.")
        if filtered_out_count > 0:
            errors.append(f"Filtered out {filtered_out_count} repositories by minimal AI match filter.")
        if excluded_count > 0:
            errors.append(f"Excluded {excluded_count} repositories by learning-resource filters (homework/study/tutorial/course).")
        if include_readme and readme_remaining == 0:
            errors.append("README fetch limit reached for this run.")

        return results[:max_articles], errors, duplicate_count, failed_count

    def _fetch_readme_excerpt(self, full_name: str, max_chars: int) -> tuple[str, bool, str | None]:
        url = GITHUB_REPO_README_API.format(full_name=full_name)
        resp = self.client.get(url)
        if resp.status_code == 404:
            return "", False, "README not found"
        if resp.status_code >= 400:
            body = resp.text[:120].replace("\n", " ").strip()
            return "", False, f"README API {resp.status_code}: {body}"

        payload = resp.json()
        encoded = (payload.get("content") or "").replace("\n", "")
        if not encoded:
            return "", False, "README content empty"

        try:
            decoded = base64.b64decode(encoded).decode("utf-8", errors="replace")
        except Exception as exc:  # noqa: BLE001
            return "", False, f"README decode failed: {exc}"

        text = decoded.strip()
        if len(text) <= max_chars:
            return text, False, None
        return text[:max_chars], True, None

    def _fetch_all_commit_messages(self, full_name: str) -> tuple[list[dict[str, str | None]], str | None]:
        url = GITHUB_REPO_COMMITS_API.format(full_name=full_name)
        rows: list[dict[str, str | None]] = []
        page = 1
        per_page = 100
        while True:
            resp = self.client.get(url, params={"per_page": str(per_page), "page": str(page)})
            if resp.status_code == 409:
                return rows, "Commits unavailable for empty repository"
            if resp.status_code == 404:
                return rows, "Repository not found for commits API"
            if resp.status_code >= 400:
                body = resp.text[:120].replace("\n", " ").strip()
                return rows, f"Commits API {resp.status_code}: {body}"

            payload = resp.json()
            if not isinstance(payload, list):
                return rows, "Commits API payload was not a list"
            if not payload:
                break

            for item in payload:
                commit_obj = item.get("commit") if isinstance(item, dict) else None
                if not isinstance(commit_obj, dict):
                    continue
                message = (commit_obj.get("message") or "").strip()
                lines = message.splitlines()
                headline = lines[0].strip() if lines else ""
                author_obj = commit_obj.get("author") if isinstance(commit_obj.get("author"), dict) else {}
                rows.append(
                    {
                        "sha": str(item.get("sha") or "")[:12] if isinstance(item, dict) else "",
                        "message": headline or message,
                        "date": str(author_obj.get("date") or ""),
                    }
                )

            if len(payload) < per_page:
                break
            page += 1

        return rows, None

    @staticmethod
    def _is_min_ai_match(full_name: str, description: str, topics: list[str]) -> bool:
        normalized_topics = {str(t).strip().lower() for t in topics if str(t).strip()}
        if normalized_topics & AI_TOPIC_KEYWORDS:
            return True

        text = f"{full_name} {description}".lower()
        return GithubArchiveCrawler._keyword_hit_count(text, MIN_AI_TEXT_KEYWORDS) >= 1

    @staticmethod
    def _is_excluded_repo(full_name: str, description: str, topics: list[str]) -> bool:
        normalized_topics = {str(t).strip().lower() for t in topics if str(t).strip()}
        if normalized_topics & EXCLUDE_TOPIC_KEYWORDS:
            return True

        text = f"{full_name} {description}".lower()
        return GithubArchiveCrawler._keyword_hit_count(text, EXCLUDE_TEXT_KEYWORDS) >= 1

    @staticmethod
    def _keyword_hit_count(text: str, keywords: list[str]) -> int:
        hits = 0
        for kw in keywords:
            pattern = r"\b" + r"\s+".join(re.escape(part) for part in kw.split()) + r"\b"
            if re.search(pattern, text):
                hits += 1
        return hits

    @staticmethod
    def _build_raw_key(url: str) -> str:
        now = datetime.now(timezone.utc)
        digest = sha1(url.encode("utf-8")).hexdigest()
        return (
            f"raw/github_archive/github_api/ai_repositories/"
            f"{now.year:04d}/{now.month:02d}/{now.day:02d}/{digest}.json"
        )
