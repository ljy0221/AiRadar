# Crawling FastAPI Server

## 1) Setup

```powershell
cd C:\Users\SSAFY\S14P21B104\AiRader\crawling
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## 2) Run

```powershell
uvicorn app.main:app --reload --host 0.0.0.0 --port 8002
```

Kafka publish env (optional):

```powershell
$env:CRAWLER_KAFKA_ENABLED="true"
$env:CRAWLER_KAFKA_BOOTSTRAP_SERVERS="localhost:29092"
$env:CRAWLER_KAFKA_TOPIC_PREFIX="airader.raw"
```

## 3) Check

- API: `http://localhost:8002`
- Health: `http://localhost:8002/health`
- Docs: `http://localhost:8002/docs`

## 4) Crawl Job (AITIMES)

`paper`/`github_archive`??Íµ¨Ï°∞Îß??¥Ïñ¥?êÍ≥†, ?ÑÏû¨ ?ôÏûë Íµ¨ÌòÑ?Ä `news + aitimes`?ÖÎãà??

```powershell
curl -X POST "http://localhost:8002/crawl/jobs" `
  -H "Content-Type: application/json" `
  -d "{\"domain\":\"news\",\"provider\":\"aitimes\",\"targets\":[\"ai_industry\",\"ai_company\"],\"max_pages_per_target\":2,\"max_articles\":30}"
```

## 4-1) Crawl Job (GDELT, 15-minute window)

`gdelt` provider collects global AI news from GDELT DOC API.
Pipeline:
- Stage 1: Get candidate URLs from GDELT query.
- Stage 2: Fetch each article URL, extract title/body, then apply AI keyword match on title+body.

```powershell
curl -X POST "http://localhost:8002/crawl/jobs" `
  -H "Content-Type: application/json" `
  -d "{\"domain\":\"news\",\"provider\":\"gdelt\",\"window_minutes\":15,\"max_articles\":100}"
```

Optional fields:
- `query_override`: custom GDELT query string
- `languages`: language filter (first item is used as `searchlang`)

Notes:
- GDELT may reject very short windows; crawler currently applies a minimum 60-minute query window when needed.
- Recommended schedule: every 3 hours. URL-level dedupe should be handled in downstream storage/pipeline.

## 4-2) Crawl Job (GitHub Search API, legacy)

Uses GitHub Search Repositories API (no HTML crawling).

```powershell
curl -X POST "http://localhost:8002/crawl/jobs" `
  -H "Content-Type: application/json" `
  -d "{\"domain\":\"github_archive\",\"provider\":\"github_api\",\"max_articles\":20,\"github_min_stars\":50,\"github_created_since_days\":90,\"github_include_readme\":true}"
```

Returned `items[].extra` includes:
- `stars`, `forks`, `watchers`, `open_issues`
- `language`, `topics`, `license`
- `created_at`, `updated_at`, `pushed_at`
- `readme_excerpt`, `readme_truncated`, `readme_error`
- `recent_commit_messages` (all paged commits: sha/message/date), `commit_messages_error`

## 4-3) Crawl Job (arXiv Paper via API, cs.AI default)

Uses arXiv API (`https://export.arxiv.org/api/query`) and defaults to `cat:cs.AI`.

```powershell
curl -X POST "http://localhost:8002/crawl/jobs" `
  -H "Content-Type: application/json" `
  -d "{\"domain\":\"paper\",\"provider\":\"arxiv_api\",\"max_articles\":50}"
```

Optional field:
- `query_override`: replace default query (example: `cat:cs.AI AND all:llm`)

Notes:
- Storage is intentionally skipped for this provider (`raw.saved=false`), so you can hand off to Kafka next.
- Returned `items[].extra` includes `pdf_url`, `categories`, `primary_category`, `search_query`.

## 4-4) Kafka message envelope

When `CRAWLER_KAFKA_ENABLED=true`, each crawled item is published to:
- `airader.raw.news`
- `airader.raw.paper`
- `airader.raw.github_archive` (legacy provider)`r`n- `airader.raw.github.trending_repo``r``n- `airader.raw.github.repo_pr_document`

Envelope fields:
- `schema_version`, `event_type`, `event_time`
- `job_id`, `domain`, `provider`, `source`, `target`
- `payload` (original `CrawledArticle`)

In API response, publish result is visible at `metadata.kafka`.

## 5) RAW S3 Scaffold

- ?òÍ≤ΩÎ≥Ä??`RAW_S3_BUCKET`???ÜÏúºÎ©??ÖÎ°ú?úÎäî ?§ÌÇµ?òÍ≥†, ?Ä???àÏ†ï keyÎß??ùÏÑ±?©Îãà??
- ?§Ï†ú S3 ?ÖÎ°ú?úÎäî Ï£ºÏÜå/Î≤ÑÌÇ∑ ?ïÏ±Ö ?ïÏ†ï ??`app/storage/raw_archive.py`?êÏÑú Íµ¨ÌòÑ?òÎ©¥ ?©Îãà??



## 4-2b) Crawl Job (GitHub Trending via GH Archive, recommended)

Uses GH Archive events within a time window to compute trend score and then fetches repo metadata + PR docs.

```powershell
curl -X POST "http://localhost:8002/crawl/jobs" `
  -H "Content-Type: application/json" `
  -d "{\"domain\":\"github_archive\",\"provider\":\"github_trending_archive\",\"github_window_hours\":3,\"github_top_n\":20,\"github_pr_per_repo\":3,\"max_articles\":120}"
```

Trend score formula:
- `trend_score = watch_delta * 3 + fork_delta * 4`
- PR event weight is not used.

Output targets:
- `trending_repo` (ranking/display)
- `repo_pr_document` (keyword extraction)
