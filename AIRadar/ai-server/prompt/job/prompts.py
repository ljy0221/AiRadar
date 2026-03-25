import json

JOB_SYSTEM_PROMPT = """You are an elite AI Futurist and Labor Market Analyst.
Your core objective is to analyze how emerging AI technologies (Generative AI, LLMs, Automation, etc.) will impact and transform a given profession's core tasks.
You must output ONLY a valid JSON array matching the required schema. Do NOT include markdown tags like ```json or any trailing/leading text.
ALL generated descriptive text values MUST be written in natural, professional, and engaging Korean (한국어)."""

def build_job_user_prompt(job_name: str, task) -> str:
    task_key = getattr(task, "taskKey", "")
    task_title = getattr(task, "taskTitle", "")
    task_desc = getattr(task, "taskDescription", "")
    
    return f"""Target Profession: '{job_name}'

Analyze the AI impact on the following single core task:
- Task Title: '{task_title}'
- Description: {task_desc}

Provide your analysis strictly following the JSON array format below. Do not add any extra text or markdown format.

[Output JSON Array Format Example]
[
  {{
    "taskKey": "{task_key}",
    "taskTitle": "{task_title}",
    "impactSummary": "지루하고 반복적인 초안 작업은 AI 비서가 순식간에 끝내주고, 사람은 풍부한 경험을 바탕으로 창의적인 결정과 가치 창출에 더 많은 시간을 쏟게 됩니다.",
    "detailedScenario": {{
      "steps": [
        "1. AI가 방대한 데이터를 수집해 초안 데이터 세팅",
        "2. 전문가는 빠진 맥락이 없는지 꼼꼼히 문맥 검토",
        "3. 인간의 통찰력이 더해진 최종 결과물 도출"
      ],
      "automationEffect": "단순 작업에 뺏기던 시간 80% 단축"
    }},
    "humanStrengths": ["상황 공감 능력", "복잡한 예외 상황 판단"],
    "recommendedSkills": ["AI 프롬프트 최적화", "AI 산출물 교차 검증"],
    "promisingTools": ["ChatGPT", "Cursor"],
    "evidence": {{
      "paper": {{"level": "HIGH", "note": "관련 자동화 연구 논문 급증"}},
      "news": {{"count": 15, "note": "글로벌 테크 트렌드 기반"}}
    }}
  }}
]

[Strict Rules]
1. `impactSummary` MUST NOT use rigid, mechanical tones like "AI will handle this, humans will handle that". Instead, write it like an engaging, intuitive magazine headline (1-2 sentences in Korean).
2. ALL output strings inside the JSON must be in Korean, except for the keys, tool names, IDs, or levels ("HIGH", "MEDIUM", "LOW").
3. Your final output MUST be exactly one JSON array starting with '[' and ending with ']'. No extra words.
"""
