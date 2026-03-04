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
