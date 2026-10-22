import asyncio
import json
import threading

import pytest

import analyzer
from models import NewsRequest, PaperRequest


def _news(article_id: str) -> NewsRequest:
    return NewsRequest(
        article_id=article_id,
        title=f"title-{article_id}",
        content=f"content-{article_id}",
        source="test",
        published_at="2026-01-01",
    )


def _paper(paper_id: str) -> PaperRequest:
    return PaperRequest(
        paper_id=paper_id,
        title=f"title-{paper_id}",
        abstract=f"abstract-{paper_id}",
        authors=["a"],
        published_at="2026-01-01",
    )


def _news_result(article_id: str) -> dict:
    return {
        "article_id": article_id,
        "sentiment": "NEUTRAL",
        "keywords": ["ai"],
        "score": 0.7,
        "summary": f"summary-{article_id}",
        "category": "LLM",
        "region": "GLOBAL",
        "companies": [],
    }


def _paper_result(paper_id: str) -> dict:
    return {
        "paper_id": paper_id,
        "keywords": ["nlp"],
        "summary": f"summary-{paper_id}",
        "category": "NLP",
        "research_area": "cs.CL",
    }


@pytest.fixture
def pipeline(monkeypatch):
    """LLM 응답을 지정하고, 임베딩·저장 호출을 기록한다.

    가짜 임베딩은 입력 텍스트 자체를 담아서, 어떤 id에 어떤 텍스트의 임베딩이 저장됐는지 검사할 수 있게 한다.
    """
    state = {"llm_response": "[]", "saved": [], "threads": []}

    async def fake_llm(system, user_prompt):
        return state["llm_response"]

    def fake_embed(texts):
        state["threads"].append(threading.current_thread())
        return [[text] for text in texts]

    def fake_save(items):
        state["threads"].append(threading.current_thread())
        state["saved"].extend(items)

    monkeypatch.setattr(analyzer, "_call_llm", fake_llm)
    monkeypatch.setattr(analyzer, "embed_texts", fake_embed)
    monkeypatch.setattr(analyzer.db, "save_embeddings", fake_save)
    return state


def test_news_results_keep_input_order_and_embeddings_follow_ids_when_llm_reorders(pipeline):
    pipeline["llm_response"] = json.dumps([_news_result("n2"), _news_result("n1")])

    result = asyncio.run(analyzer.analyze_news_batch([_news("n1"), _news("n2")]))

    # SilverRefinementJob이 응답을 요청과 인덱스로 짝지으므로 입력 순서여야 한다
    assert [r.article_id for r in result] == ["n1", "n2"]
    assert [r.summary for r in result] == ["summary-n1", "summary-n2"]
    assert pipeline["saved"] == [
        ("n1", "NEWS", ["title-n1\ncontent-n1"]),
        ("n2", "NEWS", ["title-n2\ncontent-n2"]),
    ]


def test_paper_embeddings_follow_ids_when_llm_drops_and_adds_items(pipeline):
    # p1 누락, 문자열 항목, 입력에 없는 id, 중복 id가 섞인 응답
    pipeline["llm_response"] = json.dumps([
        "garbage",
        _paper_result("p3"),
        _paper_result("unknown"),
        _paper_result("p2"),
        _paper_result("p3"),
    ])

    result = asyncio.run(analyzer.analyze_paper_batch([_paper("p1"), _paper("p2"), _paper("p3")]))

    assert [r.paper_id for r in result] == ["p2", "p3"]
    assert pipeline["saved"] == [
        ("p2", "PAPER", ["title-p2\nabstract-p2"]),
        ("p3", "PAPER", ["title-p3\nabstract-p3"]),
    ]


@pytest.mark.parametrize("llm_response", [
    json.dumps([_news_result("unknown")]),
    "[]",
])
def test_news_raises_and_saves_nothing_when_no_result_matches_input(pipeline, llm_response):
    pipeline["llm_response"] = llm_response

    with pytest.raises(ValueError, match="유효한 뉴스"):
        asyncio.run(analyzer.analyze_news_batch([_news("n1")]))
    assert pipeline["saved"] == []


@pytest.mark.parametrize("llm_response", [
    json.dumps([_paper_result("unknown")]),
    "[]",
])
def test_paper_raises_and_saves_nothing_when_no_result_matches_input(pipeline, llm_response):
    pipeline["llm_response"] = llm_response

    with pytest.raises(ValueError, match="유효한 논문"):
        asyncio.run(analyzer.analyze_paper_batch([_paper("p1")]))
    assert pipeline["saved"] == []


def test_embedding_and_db_run_off_the_event_loop_thread(pipeline):
    pipeline["llm_response"] = json.dumps([_news_result("n1")])

    asyncio.run(analyzer.analyze_news_batch([_news("n1")]))

    assert pipeline["threads"]
    assert all(t is not threading.main_thread() for t in pipeline["threads"])


def test_call_llm_uses_gms_when_key_is_set(monkeypatch):
    monkeypatch.setenv("GMS_KEY", "k")

    async def fake_claude(system, user_prompt):
        return "claude"

    def fail_local(system, user_prompt):
        raise AssertionError("로컬 모델이 호출되면 안 됨")

    monkeypatch.setattr(analyzer, "_call_claude", fake_claude)
    monkeypatch.setattr(analyzer, "_call_local", fail_local)

    assert asyncio.run(analyzer._call_llm("s", "u")) == "claude"


def test_call_llm_falls_back_to_local_model_without_key(monkeypatch):
    monkeypatch.delenv("GMS_KEY", raising=False)
    monkeypatch.setattr(analyzer, "_call_local", lambda system, user_prompt: "local")

    assert asyncio.run(analyzer._call_llm("s", "u")) == "local"
