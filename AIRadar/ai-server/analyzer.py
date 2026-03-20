import json
import logging
import os

# ── GMS / Claude 연동 (복구 시 주석 해제) ──────────────────────────────────────
# import httpx
# _GMS_URL = "https://gms.ssafy.io/gmsapi/api.anthropic.com/v1/messages"
# _MODEL = "claude-haiku-4-5-20251001"
#
# def _gms_headers() -> dict:
#     return {
#         "Content-Type": "application/json",
#         "x-api-key": os.environ["GMS_KEY"],
#         "anthropic-version": "2023-06-01",
#     }
#
# async def _call_claude(system: str, user_prompt: str) -> str:
#     """GMS 프록시를 통해 Claude에 직접 HTTP 요청하고 텍스트 응답 반환"""
#     payload = {
#         "model": _MODEL,
#         "max_tokens": 4096,
#         "system": system,
#         "messages": [{"role": "user", "content": user_prompt}],
#     }
#     async with httpx.AsyncClient(timeout=120) as client:
#         resp = await client.post(_GMS_URL, headers=_gms_headers(), json=payload)
#         resp.raise_for_status()
#         data = resp.json()
#         return data["content"][0]["text"]
# ──────────────────────────────────────────────────────────────────────────────

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

import db
from embedder import embed_texts
from models import NewsRequest, NewsResponse, PaperRequest, PaperResponse

logger = logging.getLogger(__name__)

# ── 로컬 Qwen 모델 설정 ────────────────────────────────────────────────────────
_LOCAL_MODEL_NAME = os.getenv("LOCAL_MODEL_NAME", "Qwen/Qwen2.5-3B-Instruct")
_tokenizer: AutoTokenizer | None = None
_model: AutoModelForCausalLM | None = None


def get_local_model():
    global _tokenizer, _model
    if _model is None:
        logger.info(f"로컬 LLM 로딩: {_LOCAL_MODEL_NAME}")
        _tokenizer = AutoTokenizer.from_pretrained(_LOCAL_MODEL_NAME)
        _model = AutoModelForCausalLM.from_pretrained(
            _LOCAL_MODEL_NAME,
            torch_dtype=torch.float16,
            device_map="auto",          # GPU 자동 할당
            load_in_4bit=True,          # 4bit 양자화 (VRAM ~4.5GB)
        )
        logger.info("로컬 LLM 로딩 완료")
    return _tokenizer, _model


def _call_local(system: str, user_prompt: str) -> str:
    """로컬 Qwen 모델로 추론하고 텍스트 응답 반환"""
    tokenizer, model = get_local_model()

    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user_prompt},
    ]
    text = tokenizer.apply_chat_template(
        messages, tokenize=False, add_generation_prompt=True
    )
    inputs = tokenizer([text], return_tensors="pt").to(model.device)

    with torch.no_grad():
        output_ids = model.generate(
            **inputs,
            max_new_tokens=4096,
            temperature=0.1,
            do_sample=True,
            pad_token_id=tokenizer.eos_token_id,
        )

    # 입력 토큰 제거 후 디코딩
    generated = output_ids[0][inputs.input_ids.shape[1]:]
    return tokenizer.decode(generated, skip_special_tokens=True)
# ──────────────────────────────────────────────────────────────────────────────


def _parse_json_response(raw: str) -> list[dict]:
    """모델 응답에서 JSON 배열 추출 (마크다운 코드 블록 제거 포함)"""
    text = raw.strip()
    logger.debug(f"AI 응답 원문 (첫 200자): {text[:200]}")
    if text.startswith("```"):
        text = text.split("```", 2)[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()
    return json.loads(text)


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

    import time
    logger.info(f"[뉴스] LLM 추론 시작 ({len(articles)}건)")
    t0 = time.time()
    # ── GMS 호출 (복구 시 아래 주석 해제 후 _call_local 라인 제거) ──────────────
    # raw = await _call_claude(NEWS_SYSTEM, user_prompt)
    # ──────────────────────────────────────────────────────────────────────────
    raw = _call_local(NEWS_SYSTEM, user_prompt)
    logger.info(f"[뉴스] LLM 추론 완료 ({time.time()-t0:.1f}초), 임베딩 시작")

    structured: list[dict] = _parse_json_response(raw)

    texts = [f"{a.title}\n{a.content[:500]}" for a in articles]
    embeddings = embed_texts(texts)

    db.save_embeddings([
        (s["article_id"], "NEWS", emb)
        for s, emb in zip(structured, embeddings)
    ])

    return [
        NewsResponse(
            article_id=s["article_id"],
            sentiment=s["sentiment"],
            keywords=s.get("keywords", []),
            score=float(s.get("score", 0.5)),
            summary=s.get("summary", ""),
            category=s.get("category", "ETC"),
            region=s.get("region", "GLOBAL"),
        )
        for s in structured
    ]


async def analyze_paper_batch(papers: list[PaperRequest]) -> list[PaperResponse]:
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

    import time
    logger.info(f"[논문] LLM 추론 시작 ({len(papers)}건)")
    t0 = time.time()
    # ── GMS 호출 (복구 시 아래 주석 해제 후 _call_local 라인 제거) ──────────────
    # raw = await _call_claude(PAPER_SYSTEM, user_prompt)
    # ──────────────────────────────────────────────────────────────────────────
    raw = _call_local(PAPER_SYSTEM, user_prompt)
    logger.info(f"[논문] LLM 추론 완료 ({time.time()-t0:.1f}초), 임베딩 시작")

    structured: list[dict] = _parse_json_response(raw)

    texts = [f"{p.title}\n{p.abstract[:500]}" for p in papers]
    embeddings = embed_texts(texts)

    db.save_embeddings([
        (s["paper_id"], "PAPER", emb)
        for s, emb in zip(structured, embeddings)
    ])

    return [
        PaperResponse(
            paper_id=s["paper_id"],
            keywords=s.get("keywords", []),
            summary=s.get("summary", ""),
            category=s.get("category", "ETC"),
            research_area=s.get("research_area", "cs.AI"),
        )
        for s in structured
    ]
