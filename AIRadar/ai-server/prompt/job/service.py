import logging
import os
import time
from typing import List
import httpx

from prompt.job.schema import JobForecastTaskResponse, KeywordInsight
from prompt.job.prompts import (
    JOB_SYSTEM_PROMPT,
    KEYWORD_INSIGHT_SYSTEM_PROMPT,
    build_job_user_prompt,
    build_keyword_insight_user_prompt,
)

# ai-server 최상위의 analyzer 모듈에서 내부 유틸 함수 가져오기
from analyzer import _call_local, _parse_json_response

logger = logging.getLogger(__name__)

_GMS_URL = os.getenv("GMS_URL", "https://gms.ssafy.io/gmsapi/api.anthropic.com/v1/messages")
_GMS_MODEL = os.getenv("GMS_MODEL", "claude-haiku-4-5-20251001")


def has_gms_key() -> bool:
    return bool(os.getenv("GMS_KEY"))


def get_effective_model_name() -> str:
    if has_gms_key():
        return _GMS_MODEL
    return os.getenv("LOCAL_MODEL_NAME", "Qwen/Qwen2.5-3B-Instruct")


def _gms_headers() -> dict:
    return {
        "Content-Type": "application/json",
        "x-api-key": os.environ["GMS_KEY"],
        "anthropic-version": "2023-06-01",
    }


async def _call_gms_async(system: str, user_prompt: str) -> str:
    payload = {
        "model": _GMS_MODEL,
        "max_tokens": int(os.getenv("GMS_MAX_TOKENS", "4096")),
        "system": system,
        "messages": [{"role": "user", "content": user_prompt}],
    }
    timeout = float(os.getenv("GMS_TIMEOUT_SECONDS", "120"))
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post(_GMS_URL, headers=_gms_headers(), json=payload)
        resp.raise_for_status()
        data = resp.json()
    return data["content"][0]["text"]


async def generate_keyword_insight(job_name: str, news_keywords: list[str], paper_keywords: list[str]) -> KeywordInsight:
    news = [k for k in news_keywords if k][:8]
    papers = [k for k in paper_keywords if k][:8]
    prompt = build_keyword_insight_user_prompt(job_name, news, papers)

    if has_gms_key():
        try:
            raw = await _call_gms_async(KEYWORD_INSIGHT_SYSTEM_PROMPT, prompt)
        except Exception as e:
            logger.warning(f"[{job_name}] GMS 키워드 인사이트 호출 실패, 로컬 모델로 fallback: {e}")
            raw = _call_local(KEYWORD_INSIGHT_SYSTEM_PROMPT, prompt)
    else:
        logger.warning(f"[{job_name}] GMS_KEY 미설정으로 로컬 모델 사용")
        raw = _call_local(KEYWORD_INSIGHT_SYSTEM_PROMPT, prompt)

    summary = " ".join([line.strip() for line in raw.splitlines() if line.strip()])[:500]
    if not summary:
        summary = "최근 한 달 키워드 흐름상 자동화 관련 기술의 적용 범위가 넓어지며, 반복 업무는 효율화되고 고난도 판단 업무의 중요성이 커지고 있습니다."

    return KeywordInsight(
        newsKeywords=news,
        paperKeywords=papers,
        summary=summary
    )

async def generate_forecast_batch(job_name: str, core_tasks: list) -> List[JobForecastTaskResponse]:
    """직업의 모든 핵심업무를 한 번의 LLM 호출로 분석한다."""
    user_prompt = build_job_user_prompt(job_name, core_tasks)

    logger.info(f"[{job_name}] 핵심업무 {len(core_tasks)}개 일괄 LLM 추론 시작")
    t0 = time.time()

    if has_gms_key():
        try:
            raw = await _call_gms_async(JOB_SYSTEM_PROMPT, user_prompt)
        except Exception as e:
            logger.warning(f"[{job_name}] GMS 업무 예측 호출 실패, 로컬 모델로 fallback: {e}")
            raw = _call_local(JOB_SYSTEM_PROMPT, user_prompt)
    else:
        logger.warning(f"[{job_name}] GMS_KEY 미설정으로 로컬 모델 사용")
        raw = _call_local(JOB_SYSTEM_PROMPT, user_prompt)

    logger.info(f"[{job_name}] 일괄 추론 완료 ({time.time()-t0:.1f}초)")

    parsed_array = _parse_json_response(raw)
    if not isinstance(parsed_array, list):
        raise ValueError("LLM 응답이 JSON 배열 형식이 아닙니다.")

    results_by_key = {}
    for item in parsed_array:
        task_resp = JobForecastTaskResponse(**item)
        results_by_key[task_resp.taskKey] = task_resp

    ordered_results: List[JobForecastTaskResponse] = []
    missing_keys: List[str] = []
    for task in core_tasks:
        key = getattr(task, "taskKey", "")
        if key in results_by_key:
            ordered_results.append(results_by_key[key])
        else:
            missing_keys.append(key)

    if missing_keys:
        raise ValueError(f"LLM 응답에 누락된 taskKey가 있습니다: {missing_keys}")

    return ordered_results
