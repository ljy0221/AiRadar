import asyncio
import json
import logging
import os
import threading
import time

import httpx

import db
from embedder import embed_texts
from models import NewsRequest, NewsResponse, PaperRequest, PaperResponse

logger = logging.getLogger(__name__)

# ── GMS / Claude 연동 ──────────────────────────────────────────────────────────
_GMS_URL = "https://gms.ssafy.io/gmsapi/api.anthropic.com/v1/messages"
_MODEL = "claude-haiku-4-5-20251001"


def has_gms_key() -> bool:
    return bool(os.getenv("GMS_KEY"))


def _gms_headers() -> dict:
    return {
        "Content-Type": "application/json",
        "x-api-key": os.environ["GMS_KEY"],
        "anthropic-version": "2023-06-01",
    }


async def _call_claude(system: str, user_prompt: str) -> str:
    """GMS 프록시를 통해 Claude에 직접 HTTP 요청하고 텍스트 응답 반환"""
    payload = {
        "model": _MODEL,
        "max_tokens": 4096,
        "system": system,
        "messages": [{"role": "user", "content": user_prompt}],
    }
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(_GMS_URL, headers=_gms_headers(), json=payload)
        resp.raise_for_status()
        data = resp.json()
        return data["content"][0]["text"]


# ── 로컬 Qwen 모델 (GMS_KEY 미설정 시 사용, prompt/job/service.py는 GMS 장애 시 fallback으로도 사용) ──
# torch/transformers는 무겁기 때문에 실제로 로컬 모델이 필요할 때만 import 한다.
_LOCAL_MODEL_NAME = os.getenv("LOCAL_MODEL_NAME", "Qwen/Qwen2.5-3B-Instruct")
_tokenizer = None
_model = None
# 로딩 중복(메모리 2배)과 토크나이저·generate 동시 호출을 막기 위해 스레드 간 직렬화한다.
_local_lock = threading.Lock()


def get_local_model():
    global _tokenizer, _model
    if _model is not None:
        return _tokenizer, _model
    with _local_lock:
        if _model is not None:
            return _tokenizer, _model
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer

        quantization = os.getenv("LLM_QUANTIZATION", "4bit")
        logger.info(f"로컬 LLM 로딩: {_LOCAL_MODEL_NAME} (quantization={quantization})")
        _tokenizer = AutoTokenizer.from_pretrained(_LOCAL_MODEL_NAME)
        _model = AutoModelForCausalLM.from_pretrained(
            _LOCAL_MODEL_NAME,
            torch_dtype=torch.float16,
            device_map="auto",
            load_in_4bit=quantization == "4bit",
            load_in_8bit=quantization == "8bit",
        )
        logger.info("로컬 LLM 로딩 완료")
        return _tokenizer, _model


def _call_local(system: str, user_prompt: str) -> str:
    """로컬 Qwen 모델로 추론하고 텍스트 응답 반환 (동기 함수, CPU/GPU 블로킹)"""
    import torch

    tokenizer, model = get_local_model()

    max_new_tokens = int(os.getenv("LLM_MAX_NEW_TOKENS", "1024"))
    temperature = float(os.getenv("LLM_TEMPERATURE", "0.1"))

    messages = [
        {"role": "system", "content": system},
        {"role": "user", "content": user_prompt},
    ]
    with _local_lock:
        text = tokenizer.apply_chat_template(
            messages, tokenize=False, add_generation_prompt=True
        )
        inputs = tokenizer([text], return_tensors="pt").to(model.device)

        with torch.no_grad():
            output_ids = model.generate(
                **inputs,
                max_new_tokens=max_new_tokens,
                temperature=temperature,
                do_sample=True,
                pad_token_id=tokenizer.eos_token_id,
            )

        # 입력 토큰 제거 후 디코딩
        generated = output_ids[0][inputs.input_ids.shape[1]:]
        return tokenizer.decode(generated, skip_special_tokens=True)


async def _call_llm(system: str, user_prompt: str) -> str:
    """GMS_KEY가 있으면 Claude, 없으면 로컬 모델 사용.

    로컬 추론은 동기 연산이라 이벤트 루프를 막지 않도록 스레드에서 실행한다.
    """
    if has_gms_key():
        return await _call_claude(system, user_prompt)
    return await asyncio.to_thread(_call_local, system, user_prompt)
# ──────────────────────────────────────────────────────────────────────────────


def _parse_json_response(raw: str) -> list[dict]:
    """모델 응답에서 JSON 배열 추출 (코드블록, trailing text, 잘린 JSON 모두 처리)"""
    text = raw.strip()
    logger.debug(f"AI 응답 원문 (첫 200자): {text[:200]}")

    # 코드블록 제거
    if text.startswith("```"):
        text = text.split("```", 2)[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()

    # 배열 시작 위치 찾기
    start = text.find("[")
    if start == -1:
        raise ValueError(f"JSON 배열을 찾을 수 없음: {text[:200]}")
    text = text[start:]

    # 완전한 JSON 파싱 시도 (배열 뒤에 붙은 설명 문장은 무시)
    try:
        result, _ = json.JSONDecoder().raw_decode(text)
        return result
    except json.JSONDecodeError:
        pass

    # 잘린 경우: depth 추적으로 완전히 닫힌 객체까지만 추출
    complete_end = None
    depth = 0
    in_string = False
    escape = False
    for i, ch in enumerate(text):
        if escape:
            escape = False
            continue
        if ch == '\\' and in_string:
            escape = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                complete_end = i  # 완전히 닫힌 객체의 마지막 위치

    if complete_end is not None:
        trimmed = text[:complete_end + 1] + "]"
        try:
            result = json.loads(trimmed)
            logger.warning(f"잘린 JSON 복구 성공: {len(result)}건")
            return result
        except json.JSONDecodeError:
            pass

    raise ValueError(f"JSON 파싱 실패: {text[:200]}")


def _match_by_id(structured: list, inputs_by_id: dict, id_key: str, label: str) -> list[dict]:
    """LLM 결과를 입력 id 기준으로 매칭해 입력 순서대로 반환한다.

    LLM은 항목을 빠뜨리거나 순서를 바꾸거나 없는 id를 만들어낼 수 있으므로,
    결과 순서에 기대지 않고 입력에 실제로 존재하는 id만 남긴다.
    호출 측(SilverRefinementJob)이 응답을 요청 순서와 인덱스로 짝지으므로 입력 순서를 지킨다.
    """
    results_by_id = {}
    for s in structured:
        if not isinstance(s, dict):
            continue
        content_id = s.get(id_key)
        if content_id in inputs_by_id and content_id not in results_by_id:
            results_by_id[content_id] = s

    missing = [cid for cid in inputs_by_id if cid not in results_by_id]
    if missing:
        logger.warning(f"[{label}] LLM 결과에서 누락된 항목 {len(missing)}건: {missing}")
    return [results_by_id[cid] for cid in inputs_by_id if cid in results_by_id]


async def _embed_and_save(contents: list[tuple[str, str]], content_type: str) -> None:
    """(content_id, 임베딩할 텍스트) 목록을 임베딩해 저장.

    임베딩(CPU 연산)과 DB 저장(동기 드라이버)은 이벤트 루프를 막지 않도록 스레드에서 실행한다.
    """
    if not contents:
        return
    embeddings = await asyncio.to_thread(embed_texts, [text for _, text in contents])
    await asyncio.to_thread(db.save_embeddings, [
        (content_id, content_type, emb)
        for (content_id, _), emb in zip(contents, embeddings)
    ])


NEWS_SYSTEM = (
    "You are an expert IT/AI technology news analyst. "
    "Analyze the given news articles and respond with a JSON array only. "
    "Output only the JSON array with no additional text. "
    "ALL text fields (summary, keywords, companies) MUST be written in English regardless of the input language."
)

PAPER_SYSTEM = (
    "You are an expert AI/ML research paper analyst. "
    "Analyze the given papers and respond with a JSON array only. "
    "Output only the JSON array with no additional text. "
    "ALL text fields (summary, keywords) MUST be written in English regardless of the input language."
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

    user_prompt = f"""Analyze the following {len(articles)} news articles.
Return a JSON array of objects. Each object must have exactly these keys:

Example format:
[
  {{
    "article_id": "id-from-input",
    "sentiment": "POSITIVE",
    "keywords": ["ai", "llm", "openai"],
    "score": 0.9,
    "summary": "A brief summary of the article.",
    "category": "LLM",
    "region": "GLOBAL",
    "companies": ["OpenAI", "Google"]
  }}
]

Rules:
- article_id: copy exactly from input
- sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL"
- keywords: up to 5 English lowercase strings
- score: float 0.0~1.0, AI/tech relevance
- summary: 3-4 sentences in English covering (1) main topic, (2) key findings or events, (3) significance or impact
- category: LLM | Vision | NLP | RL | Multimodal | Robotics | Semiconductor | Cloud | ETC
- region: "DOMESTIC" | "GLOBAL"
- companies: official company names in English only (e.g. "Samsung Electronics", "Baidu"), empty array if none

Articles:
{json.dumps(items, ensure_ascii=False)}

Output only the JSON array, no other text."""

    logger.info(f"[뉴스] LLM 추론 시작 ({len(articles)}건)")
    t0 = time.time()
    raw = await _call_llm(NEWS_SYSTEM, user_prompt)
    logger.info(f"[뉴스] LLM 추론 완료 ({time.time()-t0:.1f}초), 임베딩 시작")

    articles_by_id = {a.article_id: a for a in articles}
    structured = _match_by_id(_parse_json_response(raw), articles_by_id, "article_id", "뉴스")
    if not structured:
        raise ValueError(f"유효한 뉴스 분석 결과 없음. 원문: {raw[:300]}")

    matched_articles = [articles_by_id[s["article_id"]] for s in structured]
    await _embed_and_save([
        (a.article_id, f"{a.title}\n{a.content[:500]}") for a in matched_articles
    ], "NEWS")

    return [
        NewsResponse(
            article_id=s["article_id"],
            sentiment=s["sentiment"],
            keywords=s.get("keywords", []),
            score=float(s.get("score", 0.5)),
            summary=s.get("summary", ""),
            category=s.get("category", "ETC"),
            region=s.get("region", "GLOBAL"),
            companies=s.get("companies", []),
        )
        for s in structured
    ]


async def analyze_paper_batch(papers: list[PaperRequest]) -> list[PaperResponse]:
    items = [
        {
            "paper_id": p.paper_id,
            "title": p.title,
            "abstract": p.abstract[:300],
        }
        for p in papers
    ]

    user_prompt = f"""Analyze the following {len(papers)} papers.
Return a JSON array of objects. Each object must have exactly these keys:

Example format:
[
  {{
    "paper_id": "id-from-input",
    "keywords": ["transformer", "attention", "nlp"],
    "summary": "A brief one-sentence summary of the paper.",
    "category": "NLP",
    "research_area": "cs.CL"
  }}
]

Rules:
- paper_id: copy exactly from input
- keywords: up to 5 English lowercase strings in a JSON array
- summary: 2-3 sentences in English (max 80 words) covering (1) problem being solved, (2) proposed method, (3) key result or contribution. Must be a string.
- category: Vision | NLP | RL | Multimodal | Robotics | ETC
- research_area: cs.AI | cs.LG | cs.CV | cs.CL | cs.RO | cs.NE

Papers:
{json.dumps(items, ensure_ascii=False)}

Output only the JSON array, no other text."""

    logger.info(f"[논문] LLM 추론 시작 ({len(papers)}건)")
    t0 = time.time()
    raw = await _call_llm(PAPER_SYSTEM, user_prompt)
    logger.info(f"[논문] LLM 추론 완료 ({time.time()-t0:.1f}초), 임베딩 시작")

    papers_by_id = {p.paper_id: p for p in papers}
    structured = _match_by_id(_parse_json_response(raw), papers_by_id, "paper_id", "논문")
    if not structured:
        raise ValueError(f"유효한 논문 분석 결과 없음. 원문: {raw[:300]}")

    matched_papers = [papers_by_id[s["paper_id"]] for s in structured]
    await _embed_and_save([
        (p.paper_id, f"{p.title}\n{p.abstract[:500]}") for p in matched_papers
    ], "PAPER")

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
