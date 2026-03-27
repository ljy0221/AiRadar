# 소프트웨어 요구사항 명세서 (SRS)

**프로젝트명**: AiRadar — 실시간 AI 기술 인텔리전스 플랫폼
**버전**: 1.0
**작성일**: 2026-03-23
**분류**: 외부 공개용

---

## 목차

1. [소개](#1-소개)
2. [전체 설명](#2-전체-설명)
3. [시스템 아키텍처](#3-시스템-아키텍처)
4. [기능 요구사항](#4-기능-요구사항)
5. [비기능 요구사항](#5-비기능-요구사항)
6. [데이터 요구사항](#6-데이터-요구사항)
7. [외부 인터페이스 요구사항](#7-외부-인터페이스-요구사항)
8. [시스템 제약사항](#8-시스템-제약사항)
9. [용어 정의](#9-용어-정의)

---

## 1. 소개

### 1.1 목적

이 문서는 AiRadar 시스템의 소프트웨어 요구사항을 정의한다. 시스템의 기능적·비기능적 요구사항, 아키텍처, 인터페이스, 제약사항을 포함하며, 개발팀·기획자·평가자가 시스템의 범위와 동작을 명확히 이해하는 것을 목적으로 한다.

### 1.2 범위

AiRadar는 AI 기술 동향 정보를 자동으로 수집·분석·개인화하여 제공하는 실시간 인텔리전스 플랫폼이다.

**핵심 기능**:
- AI 관련 뉴스·논문·GitHub 레포지토리를 자동 수집 및 적재
- LLM(Claude Haiku)과 벡터 임베딩을 활용한 AI 기반 콘텐츠 분석
- 사용자 행동 기반 개인화 추천 피드
- 기술 트렌드 대시보드 및 키워드 분석
- 벡터 유사도 검색

**범위 외**: SNS 공유, 커뮤니티 기능, 유료 구독 결제, 모바일 앱

### 1.3 정의 및 약어

| 약어 | 설명 |
|------|------|
| SRS | Software Requirements Specification (소프트웨어 요구사항 명세서) |
| Lambda Architecture | 배치 처리와 스트림 처리를 병행하는 빅데이터 아키텍처 |
| Medallion Architecture | Bronze → Silver → Gold 단계별 데이터 정제 패턴 |
| Bronze | 원본 그대로 보존하는 1차 데이터 레이어 |
| Silver | AI 분석이 적용된 정제 데이터 레이어 |
| Gold | 서비스에 직접 사용되는 최종 데이터 레이어 |
| Delta Lake | ACID 트랜잭션을 지원하는 오픈소스 스토리지 레이어 |
| pgvector | PostgreSQL용 벡터 검색 확장 |
| ALS | Alternating Least Squares, 협업 필터링 행렬 분해 알고리즘 |
| DAG | Directed Acyclic Graph, Airflow 워크플로우 단위 |
| JWT | JSON Web Token, 무상태 인증 토큰 |

### 1.4 참고 문서

| 문서 | 위치 |
|------|------|
| ERD (Mermaid) | `AIRadar/backend/src/main/resources/db/ERD.md` |
| 추천 API 명세 | `AIRadar/frontend/RECOMMENDATION_API.md` |
| 아키텍처 가이드 | `.claude/agent_docs/architecture.md` |
| 로컬 실행 가이드 | `.claude/agent_docs/local-setup.md` |

---

## 2. 전체 설명

### 2.1 제품 관점

AiRadar는 독립 실행형 웹 플랫폼으로, 다음 외부 시스템과 연동된다.

```
[외부 데이터 소스]               [AiRadar 시스템]              [사용자]
 AITimes 뉴스 ──────────────→ Crawling Server
 GDELT 뉴스 ──────────────→ → Kafka → Bronze → Silver → Gold
 arXiv 논문 ──────────────→ → AI Server (Claude Haiku)
 GitHub Archive ──────────→ → PostgreSQL + pgvector
 Anthropic API (GMS 프록시) →                          → Next.js 프론트엔드 → 사용자
```

### 2.2 제품 기능 요약

| 기능 영역 | 설명 |
|-----------|------|
| 자동 수집 | 뉴스·논문·GitHub을 30분~1시간 주기로 자동 크롤링 |
| AI 분석 | 키워드 추출, 감정 분석, 요약, 카테고리 분류 (Claude Haiku) |
| 벡터 검색 | 768차원 임베딩 기반 의미론적 유사도 검색 |
| 개인화 추천 | 사용자 행동 이벤트 + ALS 협업 필터링 |
| 트렌드 분석 | 일별 키워드 통계, 기술 생애주기, 직업별 AI 위험도 |
| 인증/계정 | JWT 기반 회원가입·로그인, 관심 키워드 관리 |

### 2.3 사용자 분류

| 분류 | 설명 | 주요 사용 기능 |
|------|------|--------------|
| **일반 사용자** | AI 기술 동향에 관심 있는 개발자·연구자 | 뉴스 피드, 논문 조회, 검색, 대시보드 |
| **로그인 사용자** | 계정을 보유한 사용자 | 개인화 추천, 북마크, 좋아요, 관심 키워드 |
| **구독자** | 뉴스레터 신청 사용자 | 이메일 뉴스레터 수신 |
| **시스템 관리자** | 파이프라인 운영자 | Airflow DAG, Spark Job 모니터링 |

### 2.4 운영 환경

- **클라이언트**: 최신 버전 Chrome, Firefox, Safari, Edge
- **서버**: Linux(Ubuntu) 기반 Docker 컨테이너 2대 (server1, server2)
- **클라우드 스토리지**: MinIO (S3 호환, Delta Lake 사용)
- **데이터베이스**: PostgreSQL 16 (pgvector 확장 포함)

---

## 3. 시스템 아키텍처

### 3.1 전체 구성도

```
┌─────────────────────────────────────────────────────────────┐
│                         외부 데이터 소스                       │
│  AITimes · GDELT · arXiv · GitHub Archive · Anthropic API    │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP 크롤링
┌──────────────────────────▼──────────────────────────────────┐
│               Crawling Server (FastAPI :8002)                │
│  뉴스 / 논문 / GitHub 크롤링 → Kafka 발행                     │
└──────────────────────────┬──────────────────────────────────┘
                           │ Kafka Produce
┌──────────────────────────▼──────────────────────────────────┐
│             Apache Kafka (Confluent :9092)                   │
│  토픽: airader.raw.news · airader.raw.paper                  │
│        airader.raw.github_archive                            │
└────────────┬────────────────────────────────────────────────┘
             │ Kafka Consume (Spark Structured Streaming)
┌────────────▼────────────────────────────────────────────────┐
│        BRONZE LAYER — Delta Lake (MinIO s3a://airadar)       │
│  /bronze/news/batch_date={date}/                             │
│  /bronze/paper/batch_date={date}/                            │
│  /bronze/github_archive/batch_date={date}/                   │
│  [Immutable — 절대 수정 불가]                                 │
└────────────┬────────────────────────────────────────────────┘
             │ Spark SilverRefinementJob + AI 분석
┌────────────▼────────────────────────────────────────────────┐
│        SILVER LAYER — Delta Lake (MinIO s3a://airadar)       │
│  /silver/news/ · /silver/paper/ · /silver/github/           │
│  [AI 분석 결과 포함, 정제 완료]                               │
└────────────┬────────────────────────────────────────────────┘
             │ Spark GoldServingJob (JDBC)
┌────────────▼────────────────────────────────────────────────┐
│          GOLD LAYER — PostgreSQL 16 + pgvector               │
│  news_items · papers · github_repos                          │
│  content_embeddings (768차원 pgvector)                       │
│  tech_keyword_daily · tech_lifecycle · job_ai_risk           │
└────────────┬────────────────────────────────────────────────┘
             │ REST API
┌────────────▼────────────────────────────────────────────────┐
│          Spring Boot 3.3.5 (Java 17, :8888)                 │
│  news · paper · github · dashboard · search                  │
│  auth · user · recommendation · events · mail                │
└────────────┬────────────────────────────────────────────────┘
             │ HTTP REST / JSON
┌────────────▼────────────────────────────────────────────────┐
│           Next.js 16 + React 19 (TypeScript, :3000)          │
│  랜딩 · 대시보드 · 뉴스 · 직업 분석 · 프로필                  │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 AI 분석 흐름

```
Spark SilverRefinementJob
    │
    │ POST /analyze/news/batch (배치 10건)
    ▼
AI Server (FastAPI :8000)
    ├── Claude Haiku → 키워드·감정·요약·카테고리·지역 분류
    └── sentence-transformers → 768차원 임베딩
              │
              ├── 분석 결과 → Spark 반환 → Silver Delta Lake
              └── 임베딩 → content_embeddings (PostgreSQL 직접 저장)
```

### 3.3 추천 흐름

```
사용자 행동 이벤트 (기사 조회, 좋아요, 북마크, 검색)
    │ @Async fire-and-forget
    ▼
search_logs (PostgreSQL) + Redis user:{userId}:profile Hash
    │ 매일 새벽 2시 Airflow 트리거
    ▼
Spark CollaborativeFilteringJob (ALS)
    │
    ▼
user_recommendations (PostgreSQL)
    │ GET /api/v1/recommendations/news (Redis 30분 캐시)
    ▼
개인화 뉴스 피드 (Next.js)
```

### 3.4 기술 스택

| 계층 | 기술 | 버전 |
|------|------|------|
| Frontend | Next.js + React + TypeScript | 16 + 19 |
| Backend API | Spring Boot + Java | 3.3.5 + 17 |
| 데이터 처리 | Apache Spark | 3.5.0 (Scala 2.12) |
| 데이터 스토리지 | Delta Lake + MinIO | 3.1.0 |
| 메시지 브로커 | Apache Kafka | Confluent 7.4.0 |
| 관계형 DB | PostgreSQL + pgvector | 16 |
| 캐시 | Redis | 7 |
| 워크플로우 | Apache Airflow | 2.8.3 |
| AI LLM | Claude Haiku (GMS 프록시) | 4.5 |
| 임베딩 모델 | paraphrase-multilingual-mpnet-base-v2 | HuggingFace |
| 컨테이너 | Docker + Docker Compose | — |

---

## 4. 기능 요구사항

> **표기**: FR = Functional Requirement (기능 요구사항)
> **우선순위**: 필수(Must) / 권장(Should) / 선택(May)

---

### 4.1 데이터 수집 (FR-COL)

#### FR-COL-01: 뉴스 자동 수집
- **설명**: AITimes 및 GDELT 소스에서 AI 관련 뉴스를 주기적으로 수집하여 Kafka에 발행한다.
- **주기**: 30분마다 (`*/30 * * * *`)
- **수집 항목**: 제목, 본문, URL, 출처, 발행일시
- **우선순위**: 필수

#### FR-COL-02: 논문 자동 수집
- **설명**: arXiv API에서 컴퓨터 과학(cs.AI) 분야 논문을 주기적으로 수집하여 Kafka에 발행한다.
- **주기**: 30분마다
- **수집 항목**: 논문 ID, 제목, 초록, 저자 목록, 발행일
- **우선순위**: 필수

#### FR-COL-03: GitHub 레포지토리 수집
- **설명**: GitHub Archive 및 GitHub Trending에서 AI 관련 레포지토리를 수집한다.
- **수집 항목**: 레포명, 설명, 언어, 토픽, 스타 수, 포크 수, 주간 커밋 수
- **우선순위**: 필수

#### FR-COL-04: 수집 데이터 Kafka 발행
- **설명**: 수집된 원본 데이터를 Kafka 토픽(`airader.raw.news`, `airader.raw.paper`, `airader.raw.github_archive`)에 발행한다.
- **보장**: 최소 1회 전달 (at-least-once delivery)
- **우선순위**: 필수

---

### 4.2 데이터 파이프라인 (FR-PIPE)

#### FR-PIPE-01: Bronze 레이어 적재
- **설명**: Kafka 토픽의 메시지를 Spark Structured Streaming으로 소비하여 Delta Lake Bronze 레이어에 원본 그대로 저장한다.
- **경로**: `s3a://airadar/bronze/{source_type}/batch_date={date}/`
- **불변성**: Bronze 데이터는 절대 수정·삭제하지 않는다.
- **멱등성**: 동일 날짜 재실행 시 중복 없이 덮어쓰기(replaceWhere)한다.
- **우선순위**: 필수

#### FR-PIPE-02: Silver 레이어 AI 분석
- **설명**: Bronze 데이터를 읽어 AI 서버에 배치 요청을 보내고, 분석 결과를 포함한 정제 데이터를 Silver 레이어에 저장한다.
- **배치 크기**: 10건/요청
- **오류 처리**: 분석 실패 건은 `error_log` 컬럼에 기록하고 파이프라인은 중단하지 않는다.
- **우선순위**: 필수

#### FR-PIPE-03: Gold 레이어 PostgreSQL 적재
- **설명**: Silver 데이터를 읽어 PostgreSQL Gold 테이블에 Upsert한다.
- **패턴**: staging 테이블에 먼저 쓴 후 단일 트랜잭션으로 원본 테이블에 반영한다.
- **충돌 키**: `article_id` (뉴스), `paper_id` (논문), `repo_id` (GitHub)
- **우선순위**: 필수

#### FR-PIPE-04: 파이프라인 오케스트레이션
- **설명**: Airflow가 Bronze → Silver → Gold 파이프라인을 스케줄에 따라 자동 실행한다.
- **DAG 목록**:

| DAG | 스케줄 | 설명 |
|-----|--------|------|
| `crawl_news_to_kafka` | 매 30분 (`*/30 * * * *`) | AITimes·GDELT 뉴스 크롤링 → Kafka |
| `crawl_paper_to_kafka` | 매 30분 (`*/30 * * * *`) | arXiv 논문 크롤링 → Kafka |
| `crawl_github_to_kafka` | 매 3시간 (`0 */3 * * *`) | GitHub Archive 크롤링 → Kafka |
| `bronze_kafka_ingestion` | 매시간 (`@hourly`) | Kafka → Bronze Delta Lake |
| `silver_refinement` | 수동 (`None`) | Bronze → Silver (AI 분석, ExternalTaskSensor) |
| `gold_serving` | 수동 (`None`) | Silver → Gold PostgreSQL |
| `recommendation_batch` | 매일 새벽 2시 (`0 2 * * *`) | ALS 협업 필터링 |
| `trend_aggregator_daily` | 매일 새벽 2시 (`0 2 * * *`) | 키워드 트렌드 집계 |
| `wordcloud_weekly` | 매주 월요일 새벽 3시 (`0 3 * * 1`) | 주간 워드클라우드 생성 |

- **우선순위**: 필수

---

### 4.3 AI 분석 (FR-AI)

#### FR-AI-01: 뉴스 배치 분석
- **설명**: Claude Haiku LLM을 활용하여 뉴스 기사를 분석한다.
- **출력 항목**:

| 항목 | 타입 | 설명 |
|------|------|------|
| `sentiment` | POSITIVE / NEGATIVE / NEUTRAL | 감정 분석 |
| `keywords` | 문자열 배열 | 핵심 키워드 최대 5개 |
| `score` | 0.0 ~ 1.0 | 관련성 점수 |
| `summary` | 문자열 | 3문장 이내 요약 |
| `category` | 문자열 | 콘텐츠 카테고리 |
| `region` | DOMESTIC / GLOBAL | 지역 분류 |

- **우선순위**: 필수

#### FR-AI-02: 논문 배치 분석
- **설명**: Claude Haiku LLM을 활용하여 논문 초록을 분석한다.
- **출력 항목**:

| 항목 | 타입 | 예시 값 |
|------|------|---------|
| `keywords` | 문자열 배열 | — |
| `summary` | 문자열 | — |
| `category` | 문자열 | Vision, NLP, RL, Multimodal, Robotics, ETC |
| `research_area` | 문자열 | cs.AI, cs.LG, cs.CV, cs.CL |

- **우선순위**: 필수

#### FR-AI-03: 벡터 임베딩 생성 및 저장
- **설명**: AI 서버가 `paraphrase-multilingual-mpnet-base-v2` 모델로 768차원 임베딩을 생성하여 `content_embeddings` 테이블에 직접 저장한다.
- **적용 대상**: 뉴스, 논문, GitHub 레포 (타입: NEWS / PAPER / GITHUB)
- **저장 방식**: Spark 파이프라인을 경유하지 않고 AI 서버가 직접 upsert한다.
- **우선순위**: 필수

---

### 4.4 콘텐츠 조회 (FR-CONTENT)

#### FR-CONTENT-01: 뉴스 목록 조회
- **엔드포인트**: `GET /api/v1/news`
- **필터**: 지역(`region`), 카테고리(`category`), 날짜(`date`)
- **반환**: 일별 그룹 뉴스 목록, 제목·요약·감정·키워드 포함
- **인증**: 불필요
- **우선순위**: 필수

#### FR-CONTENT-02: 뉴스 상세 조회
- **엔드포인트**: `GET /api/v1/news/{articleId}`
- **반환**: 전체 뉴스 콘텐츠, 분석 결과, 회사 타임라인 연관 정보
- **우선순위**: 필수

#### FR-CONTENT-03: 논문 목록 조회
- **엔드포인트**: `GET /api/v1/papers`
- **필터**: 카테고리(`category`), 연구 분야(`researchArea`), 날짜(`date`)
- **우선순위**: 필수

#### FR-CONTENT-04: 논문 상세 조회
- **엔드포인트**: `GET /api/v1/papers/{paperId}`
- **우선순위**: 필수

#### FR-CONTENT-05: GitHub 트렌딩 조회
- **엔드포인트**: `GET /api/v1/github/trending`
- **파라미터**: `date`, `limit`(기본 10)
- **우선순위**: 필수

---

### 4.5 검색 (FR-SEARCH)

#### FR-SEARCH-01: 벡터 유사도 검색
- **엔드포인트**: `GET /api/search?q={query}&limit=10`
- **설명**: 사용자 쿼리를 임베딩으로 변환하여 `content_embeddings` 테이블에서 코사인 유사도 기반 검색을 수행한다.
- **검색 대상**: 뉴스, 논문, GitHub (통합)
- **인증**: 불필요
- **우선순위**: 필수

---

### 4.6 대시보드 (FR-DASH)

#### FR-DASH-01: 키워드 트렌드
- **엔드포인트**: `GET /api/v1/dashboard/keywords`
- **설명**: 일별 키워드 언급 통계를 반환한다.
- **우선순위**: 필수

#### FR-DASH-02: 기술 생애주기
- **엔드포인트**: `GET /api/v1/dashboard/lifecycle`
- **설명**: 기술 키워드별 트렌드 상태(성장/성숙/쇠퇴 등)를 반환한다.
- **우선순위**: 필수

#### FR-DASH-03: 직업별 AI 위험도
- **엔드포인트**: `GET /api/v1/dashboard/jobs`
- **설명**: 직업 유형별 AI 대체 위험도, 시나리오, 추천 스킬을 반환한다.
- **우선순위**: 필수

---

### 4.7 개인화 추천 (FR-RECOM)

#### FR-RECOM-01: 개인화 뉴스 피드
- **엔드포인트**: `GET /api/v1/recommendations/news`
- **설명**: 로그인한 사용자의 관심 키워드와 ALS 협업 필터링 결과를 기반으로 개인화 뉴스를 반환한다.
- **캐시**: Redis, TTL 30분
- **인증**: 필수
- **우선순위**: 필수

#### FR-RECOM-02: 트렌딩 콘텐츠
- **엔드포인트**: `GET /api/v1/recommendations/trending`
- **설명**: 검색 이벤트 빈도 기반 실시간 트렌딩 키워드·기사를 반환한다.
- **데이터**: Redis Sorted Set (`search:trending`), 매일 자정 50% 감쇠 적용
- **인증**: 불필요
- **우선순위**: 필수

#### FR-RECOM-03: ALS 협업 필터링 배치
- **설명**: 매일 새벽 2시 `search_logs` 데이터(최근 30일, 10건 이상)를 기반으로 Spark ALS 모델을 학습하여 `user_recommendations` 테이블에 결과를 저장한다.
- **조건**: 이벤트 수 < 10건이면 해당 사용자는 skip
- **우선순위**: 권장

#### FR-RECOM-04: 논문 개인화 추천
- **엔드포인트**: `POST /api/v1/recommendations/papers`
- **설명**: 사용자 관심 키워드 기반으로 관련 논문을 추천한다.
- **인증**: 필수
- **우선순위**: 권장

---

### 4.8 사용자 행동 이벤트 (FR-EVENT)

#### FR-EVENT-01: 기사 조회 이벤트
- **엔드포인트**: `POST /api/v1/events/article-view`
- **Body**: `{articleId, dwellTimeSeconds}`
- **설명**: 30초 이상 체류 시 사용자 Redis 프로파일에 키워드 가중치를 반영한다.
- **처리 방식**: `@Async` fire-and-forget, 즉시 202 반환
- **인증**: 필수
- **우선순위**: 필수

#### FR-EVENT-02: 검색 이벤트
- **엔드포인트**: `POST /api/v1/events/search`
- **Body**: `{query}`
- **설명**: 검색어를 `search_logs`에 기록하고 Redis 트렌딩 Sorted Set에 반영한다.
- **인증**: 선택 (비로그인도 가능)
- **우선순위**: 필수

#### FR-EVENT-03: 좋아요 / 북마크
- **엔드포인트**: `POST /api/v1/events/article-like`, `POST /api/v1/events/article-bookmark`
- **설명**: 사용자가 기사에 좋아요·북마크를 남긴다. `search_logs`에 기록된다.
- **인증**: 필수
- **우선순위**: 필수

---

### 4.9 사용자 계정 (FR-USER)

#### FR-USER-01: 회원가입 / 로그인
- **엔드포인트**: `POST /api/v1/auth/register`, `POST /api/v1/auth/login`
- **인증 방식**: JWT Access Token (15분) + Refresh Token (7일, Redis 저장)
- **Refresh Rotation**: Refresh 토큰 갱신 시 이전 토큰 무효화
- **우선순위**: 필수

#### FR-USER-02: 관심 키워드 관리
- **엔드포인트**: `GET/POST/DELETE /api/v1/users/me/interests`
- **설명**: 사용자가 관심 기술 키워드를 수동 등록·삭제할 수 있다. 추론된 키워드(INFERRED)도 함께 관리된다.
- **우선순위**: 필수

#### FR-USER-03: 활동 이력 조회
- **엔드포인트**: `GET /api/v1/users/me/history`, `/bookmarks`, `/likes`
- **설명**: 최근 30일 조회 이력, 북마크 목록, 좋아요 목록을 반환한다.
- **우선순위**: 필수

#### FR-USER-04: 온보딩
- **엔드포인트**: `POST /api/v1/users/me/onboarding`
- **Body**: `{interests: ["키워드1", ...]}`
- **설명**: 회원가입 후 초기 관심 키워드를 일괄 등록한다.
- **우선순위**: 필수

---

### 4.10 뉴스레터 (FR-MAIL)

#### FR-MAIL-01: 뉴스레터 구독
- **엔드포인트**: `POST /api/v1/mail`
- **Body**: `{email}`
- **설명**: 이메일을 등록하면 확인 토큰이 발급된다.
- **인증**: 불필요
- **우선순위**: 권장

#### FR-MAIL-02: 구독 해제
- **엔드포인트**: `DELETE /api/v1/mail`
- **파라미터**: `email`, `token`
- **우선순위**: 권장

---

## 5. 비기능 요구사항

### 5.1 성능 (NFR-PERF)

| ID | 요구사항 | 목표값 |
|----|----------|--------|
| NFR-PERF-01 | 뉴스·논문 목록 API 응답 시간 | p95 < 500ms |
| NFR-PERF-02 | 벡터 유사도 검색 응답 시간 | p95 < 1,000ms |
| NFR-PERF-03 | 개인화 추천 API 응답 시간 (캐시 히트) | p95 < 100ms |
| NFR-PERF-04 | 이벤트 수신 API 응답 시간 | < 50ms (202 즉시 반환) |
| NFR-PERF-05 | Spark SilverRefinementJob 처리 시간 | 건당 < 2초 (AI 서버 포함) |
| NFR-PERF-06 | 동시 접속 사용자 처리 | 100 concurrent users |

### 5.2 가용성 (NFR-AVAIL)

| ID | 요구사항 |
|----|----------|
| NFR-AVAIL-01 | 서비스 가용성 99% 이상 (월간 다운타임 < 7.2시간) |
| NFR-AVAIL-02 | Kafka 소비 실패 시 자동 재시도 (Airflow retries=2, retry_delay=5분) |
| NFR-AVAIL-03 | AI 서버 분석 실패 시 해당 건만 skip, 파이프라인 중단 없음 |
| NFR-AVAIL-04 | Redis 장애 시 DB 직접 조회로 폴백 |

### 5.3 보안 (NFR-SEC)

| ID | 요구사항 |
|----|----------|
| NFR-SEC-01 | 모든 API 통신은 HTTPS 사용 |
| NFR-SEC-02 | 비밀번호는 bcrypt 해시 후 저장 |
| NFR-SEC-03 | JWT Access Token TTL: 15분, Refresh Token TTL: 7일 |
| NFR-SEC-04 | Refresh Token Rotation: 갱신 시 이전 토큰 즉시 무효화 |
| NFR-SEC-05 | `.env` 파일은 절대 버전 관리 시스템에 커밋하지 않는다 |
| NFR-SEC-06 | API Key(GMS_KEY)는 환경변수로만 주입한다 |
| NFR-SEC-07 | SQL Injection 방지: JPA 파라미터 바인딩 / PreparedStatement 필수 사용 |

### 5.4 확장성 (NFR-SCALE)

| ID | 요구사항 |
|----|----------|
| NFR-SCALE-01 | 새로운 데이터 소스 추가 시 Crawling Server에 Provider만 추가하면 파이프라인 변경 없이 적용 가능 |
| NFR-SCALE-02 | `search_logs` 테이블은 월별 파티셔닝으로 데이터 증가에 대응 |
| NFR-SCALE-03 | MinIO → AWS S3 전환 시 환경변수 교체만으로 적용 가능 (코드 변경 없음) |
| NFR-SCALE-04 | Spark executor 수·메모리는 환경변수로 조정 가능 |

### 5.5 유지보수성 (NFR-MAINT)

| ID | 요구사항 |
|----|----------|
| NFR-MAINT-01 | 모든 Spring Boot 서비스는 `/health` 헬스체크 엔드포인트를 제공한다 |
| NFR-MAINT-02 | AI 서버 및 크롤링 서버도 `/health` 엔드포인트를 제공한다 |
| NFR-MAINT-03 | Spark Job은 `--date` 파라미터로 특정 날짜 재처리가 가능하다 |
| NFR-MAINT-04 | Bronze 레이어는 보존되므로 Silver 이후 언제든 재처리가 가능하다 |
| NFR-MAINT-05 | 파이프라인 디버깅 시 Bronze 파티션 존재 여부 → Silver 오류 로그 → Gold 조회 순서로 확인한다 |

### 5.6 호환성 (NFR-COMPAT)

| ID | 요구사항 |
|----|----------|
| NFR-COMPAT-01 | 브라우저: Chrome 120+, Firefox 120+, Safari 17+, Edge 120+ |
| NFR-COMPAT-02 | 모바일 브라우저: iOS Safari, Android Chrome (반응형 UI) |
| NFR-COMPAT-03 | API 응답 형식: `{"success": true, "data": {...}}` 래핑 구조 유지 |

---

## 6. 데이터 요구사항

### 6.1 핵심 데이터 모델

#### 뉴스 기사 (`news_items`)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `article_id` | VARCHAR(255) PK | 기사 고유 ID |
| `title` | TEXT | 제목 |
| `content` | TEXT | 본문 |
| `url` | TEXT | 원문 URL |
| `source` | VARCHAR(100) | 출처 (AITimes, GDELT 등) |
| `region` | VARCHAR(20) | DOMESTIC / GLOBAL |
| `sentiment` | VARCHAR(20) | POSITIVE / NEGATIVE / NEUTRAL |
| `keywords` | TEXT[] | AI 추출 키워드 |
| `score` | FLOAT | 관련성 점수 (0~1) |
| `summary` | TEXT | AI 생성 요약 |
| `category` | VARCHAR(100) | 분류 카테고리 |
| `view_count` | INT | 조회수 |
| `published_at` | TIMESTAMP | 발행일시 |

#### 논문 (`papers`)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `paper_id` | VARCHAR(255) PK | 논문 ID (arXiv ID) |
| `title` | TEXT | 제목 |
| `abstract` | TEXT | 초록 |
| `url` | TEXT | arXiv URL |
| `authors` | TEXT[] | 저자 목록 |
| `research_area` | VARCHAR(50) | cs.AI, cs.CV 등 |
| `keywords` | TEXT[] | AI 추출 키워드 |
| `summary` | TEXT | AI 생성 요약 |
| `category` | VARCHAR(50) | Vision, NLP, RL 등 |
| `published_at` | TIMESTAMP | 발행일 |

#### 사용자 (`users`)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `id` | UUID PK | 사용자 ID |
| `email` | VARCHAR(255) UNIQUE | 이메일 |
| `password_hash` | TEXT | bcrypt 해시 |
| `nickname` | VARCHAR(100) | 닉네임 |
| `language` | VARCHAR(10) | 언어 설정 |
| `onboarding_completed` | BOOLEAN | 온보딩 완료 여부 |
| `created_at` | TIMESTAMP | 가입일 |

#### 벡터 임베딩 (`content_embeddings`)

| 컬럼 | 타입 | 설명 |
|------|------|------|
| `content_id` | VARCHAR(255) PK | 콘텐츠 ID (article_id / paper_id / repo_id) |
| `content_type` | VARCHAR(20) | NEWS / PAPER / GITHUB |
| `embedding` | vector(768) | 768차원 벡터 |
| `created_at` | TIMESTAMP | 생성일 |
| `updated_at` | TIMESTAMP | 갱신일 |

### 6.2 데이터 보존 정책

| 레이어 | 보존 기간 | 정책 |
|--------|-----------|------|
| Bronze (Delta Lake) | 무기한 | Immutable, 삭제 금지 |
| Silver (Delta Lake) | 무기한 | 재처리 시 replaceWhere Overwrite |
| Gold (PostgreSQL) | 무기한 | Upsert (article_id 기준) |
| `search_logs` | 30일 | Spark ALS 입력, 이후 참조 감소 |
| `user_recommendations` | 1일 | `expires_at` 기반 자동 만료 |
| Redis `user:{userId}:profile` | 30일 TTL | 자동 만료 |
| Redis `refresh:{userId}` | 7일 TTL | Refresh Token 만료와 동기화 |

### 6.3 데이터 품질 요구사항

| ID | 요구사항 |
|----|----------|
| DQ-01 | Bronze 적재 시 원본 데이터 손실 없이 전체 저장 |
| DQ-02 | Silver 분석 실패 건은 `error_log` 컬럼에 기록, 집계 지표에서 제외 |
| DQ-03 | Gold Upsert는 멱등성 보장 (동일 데이터 재실행 시 결과 동일) |
| DQ-04 | 임베딩 차원은 항상 768차원 (모델 변경 시 전체 재임베딩 필요) |

---

## 7. 외부 인터페이스 요구사항

### 7.1 사용자 인터페이스

| 페이지 | URL | 주요 기능 |
|--------|-----|-----------|
| 랜딩 | `/` | 서비스 소개, 뉴스레터 구독 |
| 대시보드 | `/dashboard` | 키워드 트렌드, 기술 생애주기, AI 백과, GitHub |
| 뉴스 | `/news` | 뉴스 타임라인, 기업 활동 탭 |
| 직업 분석 | `/jobs` | 직업별 AI 위험도 목록 및 상세 |
| 프로필 | `/profile` | 관심 키워드 관리, 계정 설정 |

**UI 요구사항**:
- 반응형 디자인 (모바일/태블릿/데스크톱)
- 다크 모드 지원
- 로딩 스켈레톤 UI (API 응답 대기 중)

### 7.2 Spring Boot REST API

- **기본 URL**: `http://{host}:8888`
- **응답 형식**: JSON, 래핑 구조 `{"success": true, "data": {...}}`
- **인증**: Bearer JWT Token (Authorization 헤더)
- **에러 형식**: `{"success": false, "error": {"code": "...", "message": "..."}}`

### 7.3 외부 API 연동

| 외부 서비스 | 연동 방식 | 사용 목적 |
|------------|-----------|-----------|
| Anthropic Claude API (GMS 프록시) | HTTPS POST | 뉴스/논문 AI 분석 |
| arXiv API | HTTP GET | 논문 메타데이터 수집 |
| GitHub Archive | HTTP GET | GitHub 이벤트 데이터 수집 |
| AITimes | HTTP 크롤링 | AI 뉴스 수집 |
| GDELT | HTTP 크롤링 | 글로벌 뉴스 수집 |

### 7.4 Kafka 토픽 명세

| 토픽 | 발행자 | 소비자 | 메시지 형식 |
|------|--------|--------|------------|
| `airader.raw.news` | Crawling Server | Spark KafkaBronzeConsumerJob | JSON (뉴스 원본) |
| `airader.raw.paper` | Crawling Server | Spark KafkaBronzeConsumerJob | JSON (논문 원본) |
| `airader.raw.github_archive` | Crawling Server | Spark KafkaBronzeConsumerJob | JSON (GitHub 원본) |

---

## 8. 시스템 제약사항

### 8.1 기술 제약사항

| ID | 제약사항 | 이유 |
|----|----------|------|
| CON-01 | Spark → PostgreSQL 쓰기는 JDBC 직접 사용 (JPA 금지) | Spark 컨텍스트에서 Spring 컨텍스트 공유 불가 |
| CON-02 | `build.gradle`의 ANTLR 4.9.3 버전 고정 해제 금지 | Spark 3.5.0 ↔ Hibernate ANTLR 버전 충돌 |
| CON-03 | Logback 사용 금지, Log4j2만 허용 | Spark 호환성 |
| CON-04 | Bronze 레이어 직접 수정 금지 | Medallion 불변성 원칙 |
| CON-05 | `docker-compose --force-recreate` 금지 | Docker Compose 1.29.2 버그 (KeyError: 'ContainerConfig') |
| CON-06 | Airflow `standalone` 모드 금지 | 부하 시 gunicorn 강제 종료 |
| CON-07 | Airflow 컨테이너 메모리 최소 6GB | Spark driver(~1.4GB) + Airflow(~800MB) 합산 |
| CON-08 | JPA Entity는 Java record 불가 | JPA 프록시 생성 제약 (DTO는 record 허용) |

### 8.2 운영 제약사항

| ID | 제약사항 |
|----|----------|
| CON-09 | `.env` 파일은 버전 관리에서 제외 (`.env.example`만 커밋) |
| CON-10 | API Key(GMS_KEY)는 반드시 환경변수로 주입 (하드코딩 금지) |
| CON-11 | Kafka / Zookeeper는 배포 시 재시작 금지 (파이프라인 전체 중단 위험) |
| CON-12 | Airflow 환경변수 변경 시 컨테이너 재생성 필수 (`stop → rm → up`) |
| CON-13 | GH Archive 크롤링은 최소 `github_window_minutes=180` (데이터 1시간 지연) |

### 8.3 외부 의존성

| 서비스 | 장애 시 영향 | 폴백 |
|--------|------------|------|
| Claude API (GMS 프록시) | Silver 파이프라인 중단 | `error_log` 기록 후 skip |
| arXiv API | 논문 수집 중단 | 다음 주기 자동 재시도 |
| GitHub Archive | GitHub 데이터 수집 중단 | 다음 주기 자동 재시도 |
| Redis | 캐시 miss, 추천 느림 | DB 직접 조회 폴백 |

---

## 9. 용어 정의

| 용어 | 정의 |
|------|------|
| **Lambda Architecture** | 배치 처리(정확성)와 스트림 처리(속도)를 병행하는 빅데이터 시스템 아키텍처 |
| **Medallion Architecture** | Bronze(원본) → Silver(정제) → Gold(서빙) 3단계 데이터 품질 향상 패턴 |
| **Bronze Layer** | Kafka에서 수신한 원본 데이터를 수정 없이 저장하는 1차 스토리지. 불변(Immutable) |
| **Silver Layer** | Bronze 데이터에 AI 분석 결과를 결합한 정제 레이어. 중복 제거, null 처리 포함 |
| **Gold Layer** | 서비스에서 직접 사용하는 최종 데이터. PostgreSQL에 저장되며 API가 직접 조회 |
| **Delta Lake** | ACID 트랜잭션, 스키마 강제, 타임트래블을 지원하는 오픈소스 스토리지 레이어 |
| **ALS** | Alternating Least Squares. 사용자-아이템 행렬을 분해하는 협업 필터링 알고리즘 |
| **pgvector** | PostgreSQL에서 벡터 연산(코사인 유사도 등)을 지원하는 확장 |
| **Structured Streaming** | Spark의 마이크로배치 기반 스트림 처리 엔진. Kafka 소비에 활용 |
| **GMS 프록시** | SSAFY에서 제공하는 Claude API 게이트웨이. 직접 Anthropic 호출 대신 사용 |
| **fire-and-forget** | 요청 수신 후 즉시 응답하고 처리는 비동기로 진행하는 패턴 (이벤트 API에 적용) |
| **Upsert** | INSERT + UPDATE 복합 연산. 충돌 키가 존재하면 UPDATE, 없으면 INSERT |
| **IVFFlat Index** | pgvector의 근사 최근접 이웃 인덱스. 대규모 벡터 검색 속도 향상 |

---

*이 문서는 AiRadar 시스템의 실제 구현을 기반으로 작성되었습니다.*
*시스템 변경 시 이 문서도 함께 업데이트해야 합니다.*
