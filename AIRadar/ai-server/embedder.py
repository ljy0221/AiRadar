import os
import logging
import threading
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

MODEL_NAME = os.getenv("EMBEDDING_MODEL", "paraphrase-multilingual-mpnet-base-v2")

_model: SentenceTransformer | None = None
# HF fast tokenizer는 여러 스레드에서 동시에 쓰면 "Already borrowed" 에러가 날 수 있어 encode를 직렬화한다.
# (/embed 엔드포인트는 FastAPI 스레드풀, 분석 배치는 asyncio.to_thread에서 호출된다)
_lock = threading.Lock()


def get_model() -> SentenceTransformer:
    global _model
    if _model is not None:
        return _model
    with _lock:
        if _model is None:
            logger.info(f"임베딩 모델 로딩: {MODEL_NAME}")
            _model = SentenceTransformer(MODEL_NAME, device="cpu")
            logger.info("임베딩 모델 로딩 완료")
        return _model


def embed_texts(texts: list[str]) -> list[list[float]]:
    """텍스트 리스트를 임베딩 벡터 리스트로 변환 (dim=768)"""
    model = get_model()
    with _lock:
        embeddings = model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
    return embeddings.tolist()
