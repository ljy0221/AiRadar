import asyncio
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException

from analyzer import analyze_news_batch, analyze_paper_batch, get_local_model
from embedder import get_model
from models import NewsRequest, NewsResponse, PaperRequest, PaperResponse

# 동시 분석 요청 제한 (LLM + 임베딩 메모리 보호)
_semaphore = asyncio.Semaphore(2)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("서버 시작: 임베딩 모델 로딩 중...")
    get_model()
    logger.info("임베딩 모델 로딩 완료.")
    logger.info("로컬 LLM 로딩 중... (최초 1회, 수 분 소요될 수 있습니다)")
    get_local_model()
    logger.info("로컬 LLM 로딩 완료. 서버 준비됨.")
    yield


app = FastAPI(title="AI Radar Analysis Server", version="1.0.0", lifespan=lifespan)


@app.get("/health")
def health():
    return {"status": "ok"}


_NEWS_CHUNK_SIZE = int(os.getenv("NEWS_CHUNK_SIZE", "2"))
_PAPER_CHUNK_SIZE = int(os.getenv("PAPER_CHUNK_SIZE", "3"))


def _chunks(lst, size):
    for i in range(0, len(lst), size):
        yield lst[i:i + size]


@app.post("/analyze/news/batch", response_model=list[NewsResponse])
async def analyze_news(articles: list[NewsRequest]):
    if not articles:
        return []
    results = []
    try:
        async with _semaphore:
            for chunk in _chunks(articles, _NEWS_CHUNK_SIZE):
                results.extend(await analyze_news_batch(chunk))
        return results
    except Exception as e:
        logger.error(f"뉴스 배치 분석 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/analyze/paper/batch", response_model=list[PaperResponse])
async def analyze_papers(papers: list[PaperRequest]):
    if not papers:
        return []
    results = []
    try:
        async with _semaphore:
            for chunk in _chunks(papers, _PAPER_CHUNK_SIZE):
                results.extend(await analyze_paper_batch(chunk))
        return results
    except Exception as e:
        logger.error(f"논문 배치 분석 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))
