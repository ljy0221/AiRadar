import logging
import time
from typing import List

from prompt.job.schema import JobForecastTaskResponse
from prompt.job.prompts import JOB_SYSTEM_PROMPT, build_job_user_prompt

# ai-server 최상위의 analyzer 모듈에서 내부 유틸 함수 가져오기
from analyzer import _call_local, _parse_json_response

logger = logging.getLogger(__name__)

async def generate_forecast_batch(job_name: str, core_tasks: list) -> List[JobForecastTaskResponse]:
    """analyzer.py의 512글자 제한을 우회하기 위해, 한 번에 1개의 업무씩 넘겨서 순차적으로 답변을 받아내는 로직"""
    results = []
    
    for task in core_tasks:
        task_title = getattr(task, "taskTitle", "알 수 없는 업무")
        user_prompt = build_job_user_prompt(job_name, task)
        
        logger.info(f"[{job_name}] '{task_title}' 단일 업무 LLM 추론 시작")
        t0 = time.time()
        
        raw = _call_local(JOB_SYSTEM_PROMPT, user_prompt)
        logger.info(f"[{job_name}] '{task_title}' 완료 ({time.time()-t0:.1f}초)")
        
        try:
            parsed_array = _parse_json_response(raw)
            if not isinstance(parsed_array, list):
                parsed_array = [parsed_array]
                
            if parsed_array:
                # 1개만 요청했으므로 첫 번째 배열 요소를 꺼내서 매핑
                item = parsed_array[0]
                try:
                    task_resp = JobForecastTaskResponse(**item)
                    results.append(task_resp)
                except Exception as inner_e:
                    logger.error(f"응답 아이템 DTO 변환 중 예외 발생!\n[오류내용]: {inner_e}\n[데이터]: {item}")
            else:
                logger.error(f"빈 배열 리턴 (파싱 실패 방어): {raw}")
                
        except Exception as e:
            logger.error(f"JSON 파싱 자체를 실패했습니다: {str(e)}\nRaw Response: {raw}")
            # 개별 업무 실패 시 전체 500 에러를 낼지 고민이나, 현재는 로거 처리
            
    return results
