---
name: data_pipeline
description: AIRadar 데이터 파이프라인(Spark Bronze→Silver→Gold, Kafka, Airflow)의 구조, 스키마, 데이터 흐름을 안내합니다. 파이프라인 코드 수정이나 더미 데이터 생성 시 반드시 참고하세요.
---

# AIRadar 데이터 파이프라인

## 전체 아키텍처

```
[원천 데이터]           [Bronze]          [Silver]           [Gold]
Arxiv (논문)    ──►  원본 저장      ──►  AI 분석 적용  ──►  DB 서빙
GitHub Archive  ──►  (Kafka/S3)    ──►  정제/정규화   ──►  (PostgreSQL)
뉴스 (GDELT 등) ──►              ──►               ──►
                       ↑                  ↑
                 Kafka Consumer     Spark Job
                 KafkaBronzeConsumerJob  SilverRefinementJob
```

## Silver 레이어 스키마 (SilverSchemas.java 기준)

### 뉴스 (NEWS_SILVER_SCHEMA)
| 필드 | 타입 | 설명 |
|---|---|---|
| article_id | String | 고유 ID (NOT NULL) |
| title | String | 제목 |
| content | String | 본문 |
| url | String | 원본 URL |
| source | String | 출처 (예: Reuters, 연합뉴스) |
| published_at | String | 발행일시 |
| sentiment | String | POSITIVE / NEGATIVE / NEUTRAL |
| keywords | Array[String] | AI 추출 키워드 |
| score | Double | 감성 점수 (0.0~1.0) |
| summary | String | AI 요약 |
| category | String | AI_MODEL, AI_HARDWARE, AI_POLICY 등 |
| region | String | DOMESTIC / GLOBAL |
| error_log | String | 처리 오류 메시지 |
| batch_date | Date | 처리 배치 날짜 |

### 논문 (PAPER_SILVER_SCHEMA)
| 필드 | 타입 | 설명 |
|---|---|---|
| paper_id | String | Arxiv ID (예: 2403.09611) |
| title | String | 논문 제목 |
| abstract | String | 초록 |
| url | String | Arxiv URL |
| source | String | 항상 "arxiv" |
| authors | Array[String] | 저자 목록 |
| published_at | String | 발행일시 |
| keywords | Array[String] | AI 추출 키워드 |
| summary | String | AI 요약 |
| category | String | LLM, Agent, Vision 등 |
| research_area | String | Large Language Models, AI Agents 등 |
| batch_date | Date | 처리 배치 날짜 |

### GitHub (GITHUB_SILVER_SCHEMA)
| 필드 | 타입 | 설명 |
|---|---|---|
| repo_id | String | "org/repo" 형식 |
| repo_name | String | 레포지토리 이름 |
| description | String | 설명 |
| language | String | 주 언어 |
| topics | Array[String] | GitHub 토픽 태그 |
| stars | Long | 스타 수 |
| forks | Long | 포크 수 |
| open_issues | Integer | 열린 이슈 수 |
| weekly_commits | Integer | 주간 커밋 수 |
| star_delta_7d | Integer | 7일간 스타 증감 |
| ai_relevance | Boolean | AI 관련 여부 |
| keywords | Array[String] | 추출 키워드 |
| batch_date | Date | 처리 배치 날짜 |

## AI 서버 연동 (ai-server, FastAPI)
- **뉴스 분석**: `NewsRequest` → `NewsResponse` (sentiment, keywords, score, summary, category, region)
- **논문 분석**: `PaperRequest` → `PaperResponse` (keywords, summary, category, research_area)
- GitHub는 ai-server를 통하지 않고 Spark에서 직접 정제

## 주의사항
- Silver 데이터 생성 시 `error_log` 필드를 반드시 포함 (null 허용)
- `batch_date`는 DateType으로 처리 (StringType 아님)
- `paper_id`는 Arxiv 고유 ID 형식 유지 (예: "2403.09611")
- `article_id`는 중복 없이 생성 (예: "news-YYYYMMDD-NNN" 포맷 권장)
