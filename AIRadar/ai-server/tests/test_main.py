import pytest
from fastapi.testclient import TestClient

import main


@pytest.fixture
def loaded(monkeypatch):
    """lifespan에서 로딩되는 모델들을 기록만 하는 가짜로 바꾼다."""
    calls = []
    monkeypatch.setattr(main, "get_model", lambda: calls.append("embedding"))
    monkeypatch.setattr(main, "get_local_model", lambda: calls.append("local_llm"))
    return calls


def test_startup_skips_local_llm_when_gms_key_is_set(monkeypatch, loaded):
    monkeypatch.setenv("GMS_KEY", "k")

    with TestClient(main.app) as client:
        assert client.get("/health").json() == {"status": "ok"}

    assert loaded == ["embedding"]


def test_startup_preloads_local_llm_without_gms_key(monkeypatch, loaded):
    monkeypatch.delenv("GMS_KEY", raising=False)

    with TestClient(main.app):
        pass

    assert loaded == ["embedding", "local_llm"]


def test_embed_rejects_blank_text():
    client = TestClient(main.app)

    assert client.post("/embed", json={"text": "   "}).status_code == 400


def test_embed_batch_drops_blank_texts(monkeypatch):
    monkeypatch.setattr(main, "embed_texts", lambda texts: [[float(len(t))] for t in texts])
    client = TestClient(main.app)

    resp = client.post("/embed/batch", json={"texts": ["ab", " ", "c"]})

    assert resp.json() == {"embeddings": [[2.0], [1.0]]}


def test_news_batch_is_processed_in_chunks(monkeypatch):
    monkeypatch.setattr(main, "_NEWS_CHUNK_SIZE", 2)
    chunks = []

    async def fake_analyze(chunk):
        chunks.append([a.article_id for a in chunk])
        return [
            {
                "article_id": a.article_id, "sentiment": "NEUTRAL", "keywords": [], "score": 0.5,
                "summary": "", "category": "ETC", "region": "GLOBAL", "companies": [],
            }
            for a in chunk
        ]

    monkeypatch.setattr(main, "analyze_news_batch", fake_analyze)
    client = TestClient(main.app)
    body = [
        {"article_id": f"n{i}", "title": "t", "content": "c", "source": "s", "published_at": "d"}
        for i in range(5)
    ]

    resp = client.post("/analyze/news/batch", json=body)

    assert resp.status_code == 200
    assert chunks == [["n0", "n1"], ["n2", "n3"], ["n4"]]
    assert [r["article_id"] for r in resp.json()] == ["n0", "n1", "n2", "n3", "n4"]
