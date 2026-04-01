# AIRadar 전체 시스템 아키텍처

> 팀원 온보딩 및 기술 공유용 문서입니다.
> 최종 업데이트: 2026-03-11

---

## 목차

1. [한 줄 요약](#1-한-줄-요약)
2. [전체 데이터 흐름](#2-전체-데이터-흐름)
3. [서비스별 역할](#3-서비스별-역할)
4. [Kafka — 시스템의 중심](#4-kafka--시스템의-중심)
5. [Medallion 아키텍처 (Bronze → Silver → Gold)](#5-medallion-아키텍처-bronze--silver--gold)
6. [AI 분석 서버](#6-ai-분석-서버)
7. [Spring Boot 백엔드](#7-spring-boot-백엔드)
8. [Next.js 프론트엔드](#8-nextjs-프론트엔드)
9. [인프라 구성 (Docker)](#9-인프라-구성-docker)
10. [포트 맵](#10-포트-맵)
11. [자주 묻는 질문 (FAQ)](#11-자주-묻는-질문-faq)

---

## 1. 한 줄 요약

> **크롤링 서버가 Kafka에 원본 데이터를 쌓으면, Spark가 Bronze → Silver → Gold 순서로 정제하여 PostgreSQL에 적재하고, Spring Boot가 Next.js에 제공한다.**

기술 키워드: `Kafka` · `Spark Structured Streaming` · `Delta Lake` · `Medallion Architecture` · `FastAPI` · `Spring Boot` · `Next.js` · `Airflow`

---

## 2. 전체 데이터 흐름

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           AIRadar 데이터 파이프라인                        │
│                                                                         │
│  [크롤링 서버 :8002]                                                       │
│   AITimes / GDELT / GitHub API                                          │
│         │                                                               │
│         │ Kafka 발행 (airader.raw.news / paper / github)                 │
│         ▼                                                               │
│  ┌─────────────┐                                                        │
│  │    Kafka    │ ◄── 모든 서비스의 이벤트 허브                              │
│  └──────┬──────┘                                                        │
│         │                                                               │
│         │ Spark Structured Streaming                                    │
│         ▼                                                               │
│  [Bronze Layer] ── Delta Lake (MinIO s3a://airader/bronze)              │
│   원본 JSON 그대로 보존 (Immutable)                                        │
│         │                                                               │
│         │ Spark Batch (SilverRefinementJob)                             │
│         │   └─ AI 서버 호출 (POST /analyze/news|paper/batch)             │
│         ▼                                                               │
│  [Silver Layer] ── Delta Lake (MinIO s3a://airader/silver)              │
│   정제 + AI 분석 결과 포함 (keywords, sentiment, summary ...)              │
│         │                                                               │
│         │ Spark JDBC (GoldServingJob)                                   │
│         ▼                                                               │
│  [Gold Layer] ── PostgreSQL                                             │
│   news_items / papers / github_repos (서비스 API용)                       │
│   content_embeddings (pgvector, similarity search용)                    │
│         │                                                               │
│         │ REST API                                                      │
│         ▼                                                               │
│  [Spring Boot :8888] ──► [Next.js :3000]                               │
│                                                                         │
│  사용자 이벤트 역방향 흐름:                                                   │
│  Next.js ──POST /api/events/user──► Spring Boot ──► Kafka               │
│                                     (airader.user.events)               │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. 서비스별 역할

| 서비스 | 기술 | 포트 | 역할 |
|--------|------|------|------|
| **Crawling Server** | Python FastAPI | 8002 | AITimes·GDELT·GitHub 크롤링 → Kafka 발행 |
| **Kafka** | Confluent 7.4 | 9092 / 29092 | 모든 서비스의 이벤트 버스 |
| **Spark** | Apache Spark 3.5.0 | 7077 / 4040 | Bronze → Silver → Gold 배치 처리 |
| **AI Server** | Python FastAPI | 8000 | Claude Haiku 분석 + 임베딩 생성 |
| **MinIO** | S3-compatible | 9000 / 9001 | Bronze·Silver Delta Lake 스토리지 |
| **Airflow** | Airflow 2.8.3 | 8081 | Spark Job 스케줄링 (1시간 배치) |
| **PostgreSQL** | pgvector/pg16 | 5432 | Gold 레이어 + pgvector 임베딩 |
| **Redis** | Redis 7 | 6379 | 실시간 트렌드 캐시 |
| **Spring Boot** | Java 17 / SB 3.3.5 | 8888 | REST API + Kafka Consumer/Producer |
| **Next.js** | Next.js 16 / React 19 | 3000 | 서비스 UI |

---

## 4. Kafka — 시스템의 중심

### 왜 Kafka인가?

기존 방식(HTTP polling)은 크롤링 서버와 Spark가 강하게 결합되어 있었습니다.
Kafka를 도입하면:

- **느슨한 결합**: 크롤링 서버가 다운돼도 Kafka에 쌓인 메시지는 유실되지 않음
- **재처리 가능**: 오프셋을 되감아 과거 데이터를 다시 처리 가능
- **확장성**: Consumer를 추가하기만 하면 새 파이프라인 연결 가능
- **가시성**: Kafka GUI에서 모든 메시지 흐름을 실시간 모니터링

### 토픽 설계

```
airader.raw.news          ← 크롤링 서버 → KafkaBronzeConsumerJob
airader.raw.paper         ← 크롤링 서버 → KafkaBronzeConsumerJob
airader.raw.github        ← 크롤링 서버 → KafkaBronzeConsumerJob

airader.pipeline.bronze.done  ← KafkaBronzeConsumerJob → Spring Boot
airader.pipeline.silver.done  ← SilverRefinementJob    → Spring Boot (예정)
airader.pipeline.gold.done    ← GoldServingJob         → Spring Boot

airader.user.events       ← Spring Boot (Next.js 프록시)
airader.user.feedback     ← Spring Boot → (향후 재학습)
```

| 토픽 | 파티션 | 보존기간 | 비고 |
|------|--------|----------|------|
| `airader.raw.*` | 3 | 7일 | 데이터 원본, 재처리 가능 구간 |
| `airader.pipeline.*.done` | 1 | 1일 | 완료 알림용, 경량 |
| `airader.user.events` | 3 | 30일 | 사용자 행동 분석용 |
| `airader.user.feedback` | 1 | 90일 | 향후 모델 재학습용 |

### Kafka 메시지 형식

**원본 데이터 (airader.raw.news)**
```json
{
  "source": "aitimes",
  "url": "https://...",
  "title": "기사 제목",
  "author": "기자명",
  "published_at": "2025-03-05T09:00:00",
  "body": "기사 본문..."
}
```

**파이프라인 완료 이벤트 (airader.pipeline.bronze.done)**
```json
{
  "event_type": "pipeline.bronze.done",
  "source_type": "news",
  "timestamp": "2025-03-05T10:00:00Z"
}
```

**사용자 이벤트 (airader.user.events)**
```json
{
  "event_type": "page_view",
  "page": "/news",
  "user_id": "anonymous",
  "metadata": { "referrer": "/dashboard" }
}
```

### Kafka GUI로 확인하는 법

```bash
# 컨테이너 내부 CLI
docker exec kafka kafka-console-consumer \
  --bootstrap-server localhost:9092 \
  --topic airader.raw.news \
  --from-beginning --max-messages 5

# 토픽 목록 확인
docker exec kafka kafka-topics \
  --bootstrap-server localhost:9092 --list
```

> Kafka UI (Conduktor, Offset Explorer 등)를 `localhost:29092`로 연결하면 GUI로 확인 가능합니다.

---

## 5. Medallion 아키텍처 (Bronze → Silver → Gold)

### 레이어 개념

```
Bronze  : 원본 보존 (절대 수정 금지)
Silver  : 정제 + AI 분석 결과 포함
Gold    : 서비스에 바로 쓸 수 있는 형태 (PostgreSQL)
```

### Bronze — 원본 보존

- **경로**: `s3a://airader/bronze/{source_type}/date={date}`
- **형식**: Delta Lake (Parquet + 트랜잭션 로그)
- **규칙**: **절대 수정 불가 (Immutable)**. 재처리 필요 시 Silver부터.
- **처리 주체**: `KafkaBronzeConsumerJob.java` (Spark Structured Streaming)
  - Kafka 메시지를 읽어 파싱 후 Delta Lake에 Append
  - `Trigger.AvailableNow()` — 현재 쌓인 메시지 처리 후 종료 (배치 모드)

```
Kafka airader.raw.news
    │
    ▼  (Spark Structured Streaming)
Bronze s3a://airader/bronze/news/date=2025-03-05/
    article_id | title | content | url | source | published_at | batch_date
```

### Silver — AI 정제

- **경로**: `s3a://airader/silver/{source_type}`
- **처리 주체**: `SilverRefinementJob.java` (Spark Batch)
- **AI 서버 호출**: `POST http://ai-server:8000/analyze/news/batch` (10건씩 배치)
- **결과 컬럼 추가**: `sentiment`, `keywords`, `score`, `summary`, `category`, `region`
- **규칙**: AI 서버 실패 시 해당 레코드 skip + `error_log` 기록 (파이프라인 중단 금지)

```
Bronze (date=2025-03-05)
    │
    ▼  SilverRefinementJob
       └─ POST /analyze/news/batch → Claude Haiku
Silver airader/silver/news/
    article_id | title | ... | sentiment | keywords | score | summary | batch_date
```

### Gold — 서빙

- **저장소**: PostgreSQL
- **처리 주체**: `GoldServingJob.java` (Spark JDBC)
- **패턴**: Staging 테이블 → 단일 트랜잭션 Upsert

```sql
-- 예: news_items Upsert
INSERT INTO news_items (article_id, title, ...)
SELECT ... FROM news_items_staging
ON CONFLICT (article_id)
DO UPDATE SET sentiment = EXCLUDED.sentiment, ...;
```

| 테이블 | Conflict Key | 내용 |
|--------|-------------|------|
| `news_items` | `article_id` | 뉴스 + AI 분석 |
| `papers` | `paper_id` | 논문 + AI 분류 |
| `github_repos` | `repo_id` | GitHub 레포 스냅샷 |
| `company_news_timeline` | `(company, article_id)` | 회사별 뉴스 타임라인 |
| `content_embeddings` | `content_id` | pgvector 768차원 |

### Airflow DAG 스케줄

```
[bronze_kafka_ingestion DAG] → 매시간 실행
    consume_news   ─┐
    consume_github ─┘ (병렬)

[silver_refinement DAG] → bronze 완료 후 자동 실행
    wait_for_bronze_ingestion
        │
    refine_news   ─┐
    refine_paper  ─┤ (병렬)
    refine_github ─┘
        │
    refresh_tech_contents_view (Materialized View 갱신)

[gold_serving DAG] → silver 완료 후 실행
    upsert_news / papers / github_repos
```

### 재처리(Replay)가 필요할 때

Bronze는 항상 보존되므로 언제든 Silver부터 재처리 가능합니다.

```bash
# 1. Silver 특정 날짜 파티션 삭제
# (Delta Lake DELETE 또는 파티션 경로 직접 삭제)

# 2. Airflow에서 해당 날짜로 DAG 수동 Trigger
# Airflow UI → silver_refinement → Trigger DAG w/ config
# {"ds": "2025-03-05"}

# 3. Gold Upsert는 멱등성 보장이므로 별도 처리 불필요
```

---

## 6. AI 분석 서버

- **포트**: 8000 (FastAPI)
- **모델**: Claude Haiku (`claude-haiku-4-5-20251001`) via GMS 프록시
- **임베딩**: `paraphrase-multilingual-mpnet-base-v2` (768차원, CPU 가능)

### API 엔드포인트

```
POST /analyze/news/batch   → 뉴스 10건씩 배치 분석
POST /analyze/paper/batch  → 논문 10건씩 배치 분석
GET  /health               → 헬스 체크
```

### 중요: 임베딩 저장 흐름

```
AI Server 내부 처리 순서:
  1. Claude Haiku → keywords, sentiment, score, summary, category 생성
  2. sentence-transformers → 768차원 embedding 생성
  3. PostgreSQL content_embeddings 테이블에 직접 Upsert
  4. Spark에는 분석 결과만 반환 (embedding 미포함)
```

> **핵심**: `embedding`은 Spark 파이프라인을 거치지 않습니다.
> `news_items`, `papers`, `github_repos` 테이블에는 embedding 컬럼이 없습니다.
> similarity search는 Spring Boot가 `content_embeddings` 테이블을 직접 조회합니다.

### GMS 프록시 사용 이유

SSAFY 환경에서 Anthropic API를 직접 호출하면 차단됩니다.
GMS(SSAFY 내부 프록시)를 경유해야 합니다.

```python
# 직접 호출 ❌
url = "https://api.anthropic.com/v1/messages"

# GMS 프록시 경유 ✅
url = "https://gms.ssafy.io/gmsapi/api.anthropic.com/v1/messages"
# 환경변수: GMS_KEY
```

---

## 7. Spring Boot 백엔드

- **포트**: 8888
- **패키지**: `com.mcp.airadar`

### 주요 패키지 구조

```
com.mcp.airadar/
├── AiRadarApplication.java        # 메인 진입점
├── controller/
│   ├── HealthController.java      # GET /api/health
│   └── EventController.java       # POST /api/events/user|feedback
├── kafka/
│   ├── PipelineEventConsumer.java # @KafkaListener (bronze/gold done)
│   ├── UserEventProducer.java     # KafkaTemplate → user.events
│   └── dto/
│       ├── PipelineEvent.java
│       └── UserEvent.java
└── spark/
    ├── BronzeIngestionJob.java    # [구] HTTP 폴링 방식 (비활성화)
    ├── KafkaBronzeConsumerJob.java # [현] Kafka 방식 Bronze 적재
    ├── SilverRefinementJob.java   # Silver 정제 + AI 배치 호출
    ├── GoldServingJob.java        # Gold PostgreSQL Upsert
    ├── utils/SparkUtils.java
    └── models/SilverSchemas.java
```

### 핵심 규칙

1. **Spark Job에서 JPA EntityManager 직접 호출 금지**
   - Spark → PostgreSQL은 반드시 JDBC 직접 사용
   - `df.write().format("jdbc")...`

2. **ANTLR 버전 고정 (절대 수정 금지)**
   ```groovy
   // build.gradle — 이 설정 건드리지 말 것
   resolutionStrategy {
       force 'org.antlr:antlr4-runtime:4.9.3'
   }
   ```
   Spark 3.5.0과 Spring Boot 3.3.x(Hibernate)는 서로 다른 ANTLR 버전을 요구하기 때문입니다.

3. **Logback 사용 금지 → Log4j2만 사용**
   ```groovy
   exclude group: 'org.springframework.boot', module: 'spring-boot-starter-logging'
   implementation 'org.springframework.boot:spring-boot-starter-log4j2'
   ```

### Spark Job 실행 방법

```bash
cd AIRadar/backend

# Fat JAR 빌드 (Airflow에서 사용)
./gradlew shadowJar

# 로컬 직접 실행
./gradlew runSparkJob -Pjob=KafkaBronzeConsumerJob -PsourceType=news
./gradlew runSparkJob -Pjob=SilverRefinementJob -Pdate=2025-03-05 -PsourceType=news
./gradlew runSparkJob -Pjob=GoldServingJob -Pdate=2025-03-05
```

### Kafka Consumer/Producer (Spring Boot)

```java
// PipelineEventConsumer.java — 파이프라인 완료 이벤트 수신
@KafkaListener(topics = "airader.pipeline.bronze.done", groupId = "airader-backend")
public void onBronzeDone(String message) { ... }

// UserEventProducer.java — 사용자 이벤트 발행
kafkaTemplate.send("airader.user.events", event.userId(), payload);
```

---

## 8. Next.js 프론트엔드

- **포트**: 3000
- **기술**: Next.js 16 + React 19 + App Router

### 사용자 이벤트 트래킹

```typescript
// hooks/useEventTracking.ts
const { track, feedback } = useEventTracking('/news');

// 클릭 이벤트 발행
track('article_click', { article_id: '123' });

// 피드백 발행 (좋아요, 싫어요 등)
feedback('like', { article_id: '123' });
```

내부적으로 `POST /api/events/user` → Spring Boot → Kafka `airader.user.events` 로 흐릅니다.

### 환경변수

```bash
NEXT_PUBLIC_API_URL=http://localhost:8888  # Spring Boot API 주소
```

---

## 9. 인프라 구성 (Docker)

`AIRadar/infra/docker-compose.yml` 기준 (10개 서비스)

```bash
# 전체 실행
cd AIRadar/infra
docker compose up -d

# 특정 서비스만 재시작
docker compose restart crawling-server

# 로그 확인
docker compose logs -f kafka
docker compose logs -f spark
```

### MinIO (Delta Lake 스토리지)

```
Console UI: http://localhost:9001
ID: minioadmin / PW: minioadmin123

버킷 구조:
airadar/
├── bronze/
│   ├── news/date=2025-03-05/
│   └── github/date=2025-03-05/
└── silver/
    ├── news/
    ├── paper/
    └── github/
```

### 주요 환경변수 (.env)

```bash
# PostgreSQL
POSTGRES_DB=airadar
POSTGRES_USER=airadar
POSTGRES_PASSWORD=airadar_secret

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin123

# GitHub 크롤링
GITHUB_TOKEN=ghp_...

# AI 서버
GMS_KEY=...

# Kafka (자동 설정됨)
KAFKA_BOOTSTRAP_SERVERS=kafka:9092
KAFKA_TOPIC_PREFIX=airader.raw
```

> `.env` 파일은 절대 커밋하지 않습니다. `.env.example`만 커밋합니다.

---

## 10. 포트 맵

| 포트 | 서비스 | 용도 |
|------|--------|------|
| 3000 | Next.js | 서비스 UI |
| 8888 | Spring Boot | REST API |
| 8002 | Crawling Server | 크롤링 트리거 API |
| 8000 | AI Server | 분석 + 임베딩 API |
| 8081 | Airflow | DAG 스케줄러 UI |
| 9092 | Kafka | 내부 브로커 (Docker 네트워크) |
| 29092 | Kafka | 외부 접속 (로컬 개발 / Kafka GUI) |
| 9000 | MinIO | S3 API (Spark 접속) |
| 9001 | MinIO | 콘솔 UI |
| 5432 | PostgreSQL | Gold DB |
| 6379 | Redis | 캐시 |
| 7077 | Spark | Master (Job 제출) |
| 4040 | Spark UI | Job 모니터링 |

---

## 11. 자주 묻는 질문 (FAQ)

**Q. Bronze 데이터를 실수로 수정했어요.**
> Bronze는 Immutable입니다. 수정된 내용을 원복하고, 해당 날짜 Silver 파티션을 삭제 후 Airflow에서 재처리하면 됩니다.

**Q. Spark Job 빌드가 ANTLR 오류로 실패해요.**
> `build.gradle`의 `resolutionStrategy { force 'org.antlr:antlr4-runtime:4.9.3' }` 설정이 있는지 확인하세요. 이 줄이 삭제되면 Spark ↔ Hibernate ANTLR 충돌이 발생합니다.

**Q. AI 서버가 응답을 안 해요.**
> 1. `GMS_KEY` 환경변수가 설정됐는지 확인
> 2. GMS 프록시 URL이 올바른지 확인: `https://gms.ssafy.io/gmsapi/api.anthropic.com/v1/messages`
> 3. `docker compose logs ai-server`로 임베딩 모델 로딩 완료 여부 확인 (시작 시 최대 60초 소요)

**Q. Kafka GUI에서 메시지가 안 보여요.**
> 외부 접속 주소는 `localhost:29092`입니다 (내부 `kafka:9092`가 아님).

**Q. Silver에 `embedding` 컬럼을 추가하면 안 되나요?**
> 추가하지 않습니다. embedding은 AI 서버가 `content_embeddings` 테이블에 직접 저장합니다. Spark 파이프라인을 거치면 768차원 벡터 처리로 메모리 부하가 발생합니다.

**Q. 새로운 데이터 소스(예: Reddit)를 추가하려면?**
> 1. `crawling/app/sources/` 에 크롤러 추가
> 2. Kafka 토픽 `airader.raw.reddit` 자동 생성됨 (`KAFKA_AUTO_CREATE_TOPICS_ENABLE=true`)
> 3. `KafkaBronzeConsumerJob`에 `case "reddit"` 파싱 로직 추가
> 4. `SilverRefinementJob`에 reddit Silver 스키마 추가

---

*문서 오류나 업데이트 필요 사항은 MR/PR로 제안해 주세요.*
