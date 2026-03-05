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
Secondary AI scoring/filtering is expected in downstream cleansing stage.

```powershell
curl -X POST "http://localhost:8002/crawl/jobs" `
  -H "Content-Type: application/json" `
  -d "{\"domain\":\"news\",\"provider\":\"gdelt\",\"window_minutes\":15,\"max_articles\":100}"
```

Optional fields:
- `query_override`: custom GDELT query string
- `languages`: language filter (first item is used as `searchlang`)

## 5) RAW S3 Scaffold

- 환경변수 `RAW_S3_BUCKET`이 없으면 업로드는 스킵되고, 저장 예정 key만 생성됩니다.
- 실제 S3 업로드는 주소/버킷 정책 확정 후 `app/storage/raw_archive.py`에서 구현하면 됩니다.
