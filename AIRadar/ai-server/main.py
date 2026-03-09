import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException

from analyzer import analyze_news_batch, analyze_paper_batch
from embedder import get_model
from models import NewsRequest, NewsResponse, PaperRequest, PaperResponse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("서버 시작: 임베딩 모델 로딩 중...")
    get_model()
    logger.info("임베딩 모델 로딩 완료. 서버 준비됨.")
    yield


app = FastAPI(title="AI Radar Analysis Server", version="1.0.0", lifespan=lifespan)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/analyze/news/batch", response_model=list[NewsResponse])
async def analyze_news(articles: list[NewsRequest]):
    if not articles:
        return []
    try:
        return await analyze_news_batch(articles)
    except Exception as e:
        logger.error(f"뉴스 배치 분석 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze/paper/batch", response_model=list[PaperResponse])
async def analyze_papers(papers: list[PaperRequest]):
    if not papers:
        return []
    try:
        return await analyze_paper_batch(papers)
    except Exception as e:
        logger.error(f"논문 배치 분석 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))
