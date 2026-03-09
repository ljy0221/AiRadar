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

## 3) Check

- API: `http://localhost:8002`
- Health: `http://localhost:8002/health`
- Docs: `http://localhost:8002/docs`

## 4) Crawl Job (AITIMES)

`paper`/`github_archive`는 구조만 열어두고, 현재 동작 구현은 `news + aitimes`입니다.

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
- You can still schedule the job every 15 minutes. URL-level dedupe should be handled in downstream storage/pipeline.

## 4-2) Crawl Job (GitHub Archive via API)

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

## 5) RAW S3 Scaffold

- 환경변수 `RAW_S3_BUCKET`이 없으면 업로드는 스킵되고, 저장 예정 key만 생성됩니다.
- 실제 S3 업로드는 주소/버킷 정책 확정 후 `app/storage/raw_archive.py`에서 구현하면 됩니다.
