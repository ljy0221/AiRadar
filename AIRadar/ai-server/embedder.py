import os
import logging
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

MODEL_NAME = os.getenv("EMBEDDING_MODEL", "paraphrase-multilingual-mpnet-base-v2")

_model: SentenceTransformer | None = None


def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        logger.info(f"임베딩 모델 로딩: {MODEL_NAME}")
        _model = SentenceTransformer(MODEL_NAME)
        logger.info("임베딩 모델 로딩 완료")
    return _model


def embed_texts(texts: list[str]) -> list[list[float]]:
    """텍스트 리스트를 임베딩 벡터 리스트로 변환 (dim=768)"""
    model = get_model()
    embeddings = model.encode(texts, convert_to_numpy=True, show_progress_bar=False)
    return embeddings.tolist()
