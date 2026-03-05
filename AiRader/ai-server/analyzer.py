import json
import logging
import os

from anthropic import AsyncAnthropic

import db
from embedder import embed_texts
from models import NewsRequest, NewsResponse, PaperRequest, PaperResponse

logger = logging.getLogger(__name__)

_client: AsyncAnthropic | None = None


def get_client() -> AsyncAnthropic:
    global _client
    if _client is None:
        _client = AsyncAnthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    return _client


NEWS_SYSTEM = (
    "당신은 IT/AI 기술 뉴스 분석 전문가입니다. "
    "주어진 뉴스 기사들을 분석하여 정확히 JSON 배열로만 응답하세요. "
    "다른 텍스트 없이 JSON 배열만 출력하세요."
)

PAPER_SYSTEM = (
    "당신은 AI/ML 논문 분석 전문가입니다. "
    "주어진 논문들을 분석하여 정확히 JSON 배열로만 응답하세요. "
    "다른 텍스트 없이 JSON 배열만 출력하세요."
)


async def analyze_news_batch(articles: list[NewsRequest]) -> list[NewsResponse]:
    client = get_client()

    items = [
        {
            "article_id": a.article_id,
            "title": a.title,
            "content": a.content[:800],
        }
        for a in articles
    ]

    user_prompt = f"""다음 {len(articles)}개의 뉴스 기사를 분석하세요.
각 기사에 대해 아래 필드를 포함한 JSON 배열로 반환하세요:
- article_id (입력값 그대로)
- sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL"
- keywords: 핵심 AI/기술 키워드 최대 5개 (영어 소문자 list)
- score: AI/기술 관련도 0.0~1.0 (float)
- summary: 2문장 이내 한국어 요약 (string)
- category: LLM | Vision | NLP | RL | Multimodal | Robotics | Semiconductor | Cloud | ETC
- region: "DOMESTIC" | "GLOBAL"

기사 목록:
{json.dumps(items, ensure_ascii=False)}

응답 형식: JSON 배열만 출력"""

    msg = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=4096,
        system=NEWS_SYSTEM,
        messages=[{"role": "user", "content": user_prompt}],
    )

    structured: list[dict] = json.loads(msg.content[0].text)

    texts = [f"{a.title}\n{a.content[:500]}" for a in articles]
    embeddings = embed_texts(texts)

    # embedding → content_embeddings 테이블에 직접 저장 (Spark 파이프라인 미경유)
    db.save_embeddings([
        (s["article_id"], "NEWS", emb)
        for s, emb in zip(structured, embeddings)
    ])

    results = []
    for s in structured:
        results.append(
            NewsResponse(
                article_id=s["article_id"],
                sentiment=s["sentiment"],
                keywords=s.get("keywords", []),
                score=float(s.get("score", 0.5)),
                summary=s.get("summary", ""),
                category=s.get("category", "ETC"),
                region=s.get("region", "GLOBAL"),
            )
        )
    return results


async def analyze_paper_batch(papers: list[PaperRequest]) -> list[PaperResponse]:
    client = get_client()

    items = [
        {
            "paper_id": p.paper_id,
            "title": p.title,
            "abstract": p.abstract[:800],
        }
        for p in papers
    ]

    user_prompt = f"""다음 {len(papers)}개의 논문을 분석하세요.
각 논문에 대해 아래 필드를 포함한 JSON 배열로 반환하세요:
- paper_id (입력값 그대로)
- keywords: 핵심 기술 키워드 최대 5개 (영어 소문자 list)
- summary: 3문장 이내 한국어 요약 (string)
- category: Vision | NLP | RL | Multimodal | Robotics | ETC
- research_area: cs.AI | cs.LG | cs.CV | cs.CL | cs.RO | cs.NE

논문 목록:
{json.dumps(items, ensure_ascii=False)}

응답 형식: JSON 배열만 출력"""

    msg = await client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=4096,
        system=PAPER_SYSTEM,
        messages=[{"role": "user", "content": user_prompt}],
    )

    structured: list[dict] = json.loads(msg.content[0].text)

    texts = [f"{p.title}\n{p.abstract[:500]}" for p in papers]
    embeddings = embed_texts(texts)

    # embedding → content_embeddings 테이블에 직접 저장 (Spark 파이프라인 미경유)
    db.save_embeddings([
        (s["paper_id"], "PAPER", emb)
        for s, emb in zip(structured, embeddings)
    ])

    results = []
    for s in structured:
        results.append(
            PaperResponse(
                paper_id=s["paper_id"],
                keywords=s.get("keywords", []),
                summary=s.get("summary", ""),
                category=s.get("category", "ETC"),
                research_area=s.get("research_area", "cs.AI"),
            )
        )
    return results
