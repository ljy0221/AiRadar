---
name: dummy_data
description: AIRadar 프로젝트의 더미 데이터(Arxiv 논문, GitHub Archive, 뉴스) 생성 규칙과 예시를 안내합니다. 백엔드 미연동 상태에서 프론트엔드 개발 시 참고하세요.
---

# AIRadar 더미 데이터 가이드

## 더미 데이터 원칙
1. **스키마 준수**: Silver 레이어 필드 구조를 반드시 따른다 (`SilverSchemas.java` 참조)
2. **ID 포맷 통일**: 소스별 고유 ID 규칙을 지킨다
3. **Enum 값 준수**: sentiment, region, riskLevel 등 열거형은 정해진 값만 사용
4. **날짜 포맷**: ISO 8601 (`2026-03-15T08:30:00`)

---

## 📄 Arxiv 논문 더미 데이터

### ID 규칙
- `paper_id`: Arxiv 번호 형식 — `YYMM.NNNNN` (예: `2403.09611`)

### 카테고리 예시
| category | researchArea |
|---|---|
| LLM | Large Language Models |
| Agent | AI Agents |
| Vision | Computer Vision |
| Multimodal | Multimodal AI |
| Efficient | Efficient AI / Edge AI |

### 예시 레코드
```json
{
  "paperId": "2403.09611",
  "title": "Mixtral of Experts: Scaling Sparse Architectures for Efficient LLM Inference",
  "abstractText": "We introduce Mixtral 8x7B, a Sparse Mixture of Experts (SMoE) language model...",
  "url": "https://arxiv.org/abs/2403.09611",
  "source": "arxiv",
  "authors": ["Albert Q. Jiang", "Alexandre Sablayrolles"],
  "researchArea": "Large Language Models",
  "keywords": ["sparse mixture of experts", "LLM", "inference efficiency"],
  "summary": "SMoE 방식으로 추론 효율을 높인 LLM 아키텍처 제안.",
  "category": "LLM",
  "publishedAt": "2026-03-14T09:22:00"
}
```

---

## 🐙 GitHub Archive 더미 데이터

### ID 규칙
- `repo_id`: `"org/repo"` 형식 (예: `"microsoft/BitNet"`)

### 핵심 지표
- `star_delta_7d`: 양수 = 성장, 음수 = 감소
- `ai_relevance`: AI 관련 레포면 `true`
- `weekly_commits`: 최근 7일 커밋 수

### 예시 레코드
```json
{
  "repo_id": "microsoft/BitNet",
  "repo_name": "microsoft/BitNet",
  "description": "Official inference framework for 1-bit LLMs",
  "language": "C++",
  "topics": ["llm", "quantization", "inference", "1-bit"],
  "stars": 12840,
  "forks": 987,
  "open_issues": 43,
  "weekly_commits": 28,
  "star_delta_7d": 1230,
  "ai_relevance": true,
  "keywords": ["LLM", "quantization", "edge AI"],
  "batch_date": "2026-03-15"
}
```

---

## 📰 뉴스 더미 데이터

### ID 규칙
- `article_id`: `"news-YYYYMMDD-NNN"` (예: `"news-20260315-001"`)

### Enum 값
- `sentiment`: `POSITIVE` / `NEGATIVE` / `NEUTRAL`
- `region`: `GLOBAL` / `DOMESTIC`
- `category`: `AI_MODEL`, `AI_HARDWARE`, `AI_POLICY`, `AI_RESEARCH`, `AI_BUSINESS`
- `countryCode`: ISO 2자리 (예: `US`, `KR`, `GB`)

### score 범위
- 0.7~1.0: POSITIVE 기사
- 0.4~0.6: NEUTRAL 기사
- 0.0~0.3: NEGATIVE 기사

### 예시 레코드
```json
{
  "articleId": "news-20260315-001",
  "title": "OpenAI, GPT-5 출시 임박… 추론 능력 GPT-4o 대비 3배 향상",
  "content": "OpenAI가 오는 4월 차세대 모델 GPT-5를 공개할 예정...",
  "url": "https://techcrunch.com/2026/03/15/openai-gpt5",
  "source": "TechCrunch",
  "countryCode": "US",
  "region": "GLOBAL",
  "sentiment": "POSITIVE",
  "keywords": ["OpenAI", "GPT-5", "LLM"],
  "score": 0.8732,
  "summary": "OpenAI가 GPT-5를 4월 출시 예정, 추론 성능 3배 향상.",
  "category": "AI_MODEL",
  "viewCount": 14230,
  "publishedAt": "2026-03-15T08:30:00"
}
```

---

## 🖥 프론트엔드 Mock 연동 방법
더미 데이터를 프론트엔드 서비스 파일에 삽입할 때:

```typescript
// services/newsApi.ts
const MOCK_NEWS: NewsListItem[] = [ /* 위 예시 데이터 */ ];

// TODO: replace with real API
export const fetchNewsList = async (): Promise<NewsListItem[]> => {
  return new Promise(resolve => setTimeout(() => resolve(MOCK_NEWS), 800));
};
```
