# AiRadar 기술 문서

**프로젝트**: AiRadar — 실시간 AI 기술 인텔리전스 플랫폼
**작성일**: 2026-03-25
**대상**: 프로젝트 발표·심사 평가자

---

## 목차

1. [기술 선정 이유](#1-기술-선정-이유)
2. [아키텍처 설계 결정](#2-아키텍처-설계-결정)
3. [데이터 파이프라인 상세](#3-데이터-파이프라인-상세)
4. [AI 분석 시스템](#4-ai-분석-시스템)
5. [추천 시스템](#5-추천-시스템)
6. [성능 수치 및 튜닝](#6-성능-수치-및-튜닝)
7. [트러블슈팅 사례](#7-트러블슈팅-사례)
8. [보안 설계](#8-보안-설계)

---

## 1. 기술 선정 이유

### 1.1 Apache Spark 3.5.0 (vs. Flink, Pandas)

| 비교 항목 | Spark | Flink | Pandas |
| --- | --- | --- | --- |
| Delta Lake 통합 | 공식 지원 (Delta Lake 3.1.0) | 별도 커넥터 필요 | 미지원 |
| ACID 트랜잭션 | 지원 (`replaceWhere` Overwrite) | 제한적 | 미지원 |
| ALS 협업 필터링 | `spark-mllib` 내장 | 별도 구현 필요 | scikit-learn (단일 노드) |
| 스케일아웃 | 클러스터 확장 가능 | 가능 | 불가 |
| 선정 이유 | **Delta Lake + ALS를 단일 생태계에서** 처리 가능 | — | — |

**핵심 결정**: Bronze → Silver → Gold 파이프라인 전체를 Spark 하나로 처리하면서, 협업 필터링(ALS)까지 같은 클러스터에서 실행 가능. 별도 ML 서비스 불필요.

---

### 1.2 Delta Lake 3.1.0 (vs. Parquet, Iceberg)

| 비교 항목 | Delta Lake | Parquet | Iceberg |
| --- | --- | --- | --- |
| ACID 트랜잭션 | 지원 | 미지원 | 지원 |
| `replaceWhere` Overwrite | 지원 | 미지원 | 지원 |
| 타임트래블 | 지원 | 미지원 | 지원 |
| Spark 통합 성숙도 | 가장 성숙 | N/A | 성숙 |
| 선정 이유 | **멱등성 보장 재처리**가 핵심 요구사항 | — | — |

**핵심 결정**: Silver 재처리 시 `replaceWhere='batch_date=YYYY-MM-DD'`로 해당 파티션만 덮어쓰기. 동일 날짜로 재실행해도 항상 같은 결과를 보장.

```java
// SilverRefinementJob.java — 멱등 재처리 핵심 코드
df.write()
  .format("delta")
  .mode(SaveMode.Overwrite)
  .option("replaceWhere", "batch_date = '" + date + "'")
  .save(silverPath);
```

---

### 1.3 PostgreSQL 16 + pgvector (vs. Weaviate, Pinecone, Qdrant)

| 비교 항목 | PostgreSQL + pgvector | 전용 벡터 DB |
| --- | --- | --- |
| 추가 서비스 | 불필요 (PostgreSQL 확장) | 별도 서비스 운영 필요 |
| SQL 조인 | 벡터 + 관계형 데이터 동시 조회 | 별도 조회 후 합산 |
| 운영 복잡도 | 낮음 | 높음 |
| 성능 (768차원) | IVFFlat 인덱스 (lists=100) | 최적화됨 |
| 선정 이유 | **인프라 단순화**: 벡터 DB 추가 없이 기존 PostgreSQL 활용 | — |

**IVFFlat 인덱스 설정**:
```sql
CREATE INDEX ON content_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
-- lists=100: 데이터 100만건 이하에서 최적 (√N 규칙)
```

**임베딩 모델 선정**: `paraphrase-multilingual-mpnet-base-v2`
- 768차원 (IVFFlat 최적 범위)
- **다국어 지원**: 한국어 뉴스 + 영어 논문을 같은 공간에서 검색 가능
- CPU만으로 실행 가능 (GPU 불필요) → 운영 비용 절감

---

### 1.4 Apache Kafka (vs. RabbitMQ, AWS SQS)

| 비교 항목 | Kafka | RabbitMQ | AWS SQS |
| --- | --- | --- | --- |
| 메시지 보존 | 기간 설정 가능 (재처리 가능) | 소비 후 삭제 | 소비 후 삭제 |
| Spark Structured Streaming | 공식 지원 | 별도 커넥터 | 별도 커넥터 |
| 오프셋 관리 | 소비자 측에서 관리 | 브로커 측 | — |
| 선정 이유 | **Spark Structured Streaming과 네이티브 통합** + 메시지 재처리 가능 | — | — |

**Kafka → Spark 연동 핵심 설정**:
```java
// KafkaBronzeConsumerJob.java
Dataset<Row> stream = spark.readStream()
    .format("kafka")
    .option("kafka.bootstrap.servers", bootstrapServers)
    .option("startingOffsets", "earliest")          // 재처리 시 전체 읽기
    .option("failOnDataLoss", "false")              // 오프셋 만료 시 스킵
    .option("kafka.session.timeout.ms", "30000")    // 30초 세션 타임아웃
    .load();

// AvailableNow: 현재 시점까지의 메시지만 처리 후 종료 (배치 모드)
stream.writeStream()
    .trigger(Trigger.AvailableNow())
    .start()
    .awaitTermination();
```

---

### 1.5 Redis (vs. Memcached, Ehcache)

| 용도 | 자료구조 | TTL | 이유 |
| --- | --- | --- | --- |
| 유저 행동 프로파일 | Hash (`user:{id}:profile`) | 30일 | 키워드별 가중치 필드 단위 갱신 |
| 실시간 트렌딩 | Sorted Set (`search:trending`) | 매일 자정 50% 감쇠 | 점수 기반 Top-N 조회 O(log N) |
| JWT Refresh Token | String (`refresh:{userId}`) | 7일 | Rotation 시 즉시 무효화 |
| 추천 결과 캐시 | String (`user:{id}:recommendations`) | 30분 | ALS 배치 결과 서빙 가속 |

**트렌딩 감쇠 로직**: 매일 자정 모든 점수에 0.5 곱하기 → 오래된 트렌드는 자연스럽게 퇴장

---

### 1.6 Claude Haiku (vs. GPT-4o-mini, 오픈소스 LLM)

| 비교 항목 | Claude Haiku | GPT-4o-mini | 로컬 Qwen 2.5-3B |
| --- | --- | --- | --- |
| 속도 | 빠름 | 빠름 | 느림 (로컬 추론) |
| JSON 구조화 출력 | 우수 | 우수 | 불안정 |
| 비용 | SSAFY GMS 무료 | 유료 | 무료 |
| 다국어 | 우수 | 우수 | 양호 |
| 선정 이유 | **SSAFY GMS 프록시로 무료 사용**, JSON 응답 안정성 | — | — |

> **GMS 키 만료 대응**: 로컬 Qwen 2.5-3B (4bit quantization) 폴백 구현
> `analyzer.py`의 `_call_claude()` ↔ `_call_local()` 전환으로 무중단 대응

---

### 1.7 Apache Airflow 2.8.3 (vs. Prefect, Dagster)

**선정 이유**: SparkSubmitOperator가 내장되어 Spark Job 트리거를 코드 없이 설정 가능. ExternalTaskSensor로 Bronze 완료 후 Silver 자동 실행하는 의존성 체인 구성 용이.

```python
# DAG 의존성 체인
wait_for_bronze >> refine_news >> refine_paper >> refine_github >> refresh_view
```

> **Airflow 2.8.x 변경사항 주의**: `airflow dags clear` 명령 제거됨 → `airflow tasks clear <dag_id>` 사용

---

## 2. 아키텍처 설계 결정

### 2.1 Lambda Architecture 채택 이유

실시간 데이터 수집(Kafka)과 정확한 배치 분석(Spark)을 분리해야 하는 요구사항 때문에 Lambda Architecture를 선택했다.

```
Speed Layer:  크롤링 서버 → Kafka → Bronze (30분 지연 이내 수집)
Batch Layer:  Bronze → Silver(AI 분석) → Gold (1시간 주기 배치)
Serving Layer: PostgreSQL + Redis → Spring Boot → Next.js
```

순수 스트리밍으로 Claude Haiku 분석을 실시간 처리하면 API 비용과 레이턴시가 급증한다. 배치로 묶어 10건씩 처리하는 것이 비용·성능 모두에서 최적이다.

---

### 2.2 Bronze Immutability (불변성 원칙)

Bronze 레이어를 절대 수정하지 않는 이유:

1. **재처리 자유도**: AI 서버 장애, 모델 업그레이드, 버그 발견 시 Silver부터 다시 처리 가능
2. **감사 추적**: 원본 데이터와 분석 결과를 언제든 비교 가능
3. **멱등성**: `--date` 파라미터만 바꿔 같은 날짜 재처리 시 항상 같은 결과

```
Bronze 파티션 경로: s3a://airadar/bronze/{source_type}/batch_date={date}/
                    ← Kafka timestamp 기준 (published_at 아님)
```

> **논문 특수 케이스**: arXiv 논문의 `published_at`은 수일~수주 전 날짜. `batch_date`는 반드시 Kafka 수신 시각(kafka_timestamp) 기준으로 설정. 그렇지 않으면 Silver Job의 `--date`와 불일치하여 0건 처리됨.

---

### 2.3 Staging 테이블 패턴 (Gold Upsert)

Spark JDBC Writer는 PostgreSQL `ON CONFLICT ... DO UPDATE` 구문을 직접 지원하지 않는다. 이를 해결하기 위해 staging 테이블 경유 패턴을 설계했다.

```
Spark Writer → news_items_staging (OVERWRITE)
                      ↓ 단일 트랜잭션
               BEGIN;
               INSERT INTO news_items
                 SELECT * FROM news_items_staging
                 ON CONFLICT (article_id) DO UPDATE SET ...;
               TRUNCATE news_items_staging;
               COMMIT;
```

**장점**:
- Spark → DB 쓰기 실패 시 원본 테이블 영향 없음
- 트랜잭션 원자성 보장: 부분 적재 상태 없음
- 멱등성: 재실행해도 staging → 원본 upsert는 동일 결과

---

### 2.4 임베딩 저장 위치 결정

임베딩을 Silver/Gold 레이어에 두지 않고 AI 서버가 `content_embeddings` 테이블에 직접 저장하는 이유:

1. **Spark JDBC 오버헤드**: 768차원 벡터를 Spark DataSet으로 직렬화·전송하면 성능 저하
2. **파이프라인 분리**: 임베딩 업데이트(AI 서버)와 메타데이터 업데이트(Spark)를 독립적으로 운영
3. **pgvector 타입 호환**: Spark JDBC는 `vector(768)` 타입을 직접 쓸 수 없음

```
AI Server 내부 흐름:
  Claude Haiku 분석 → 분석 결과만 Spark에 반환
  sentence-transformers → 768차원 임베딩 → content_embeddings 직접 Upsert
```

---

## 3. 데이터 파이프라인 상세

### 3.1 KafkaBronzeConsumerJob 설정값

| 설정 항목 | 값 | 설명 |
| --- | --- | --- |
| `startingOffsets` | `earliest` | 재처리 시 전체 메시지 읽기 |
| `failOnDataLoss` | `false` | 오프셋 만료 시 스킵 (중단 방지) |
| `kafka.session.timeout.ms` | `30,000` ms | 세션 타임아웃 30초 |
| Trigger 방식 | `AvailableNow()` | 현재 적재된 메시지만 처리 후 종료 |
| Checkpoint 경로 | `/tmp/kafka-checkpoint` | 환경변수 `KAFKA_CHECKPOINT_PATH` |
| Kafka `acks` | `all` | 모든 레플리카 확인 후 완료 처리 |
| Kafka `retries` | `3` | 발행 실패 시 재시도 횟수 |
| Kafka `linger.ms` | `50` ms | 배치 대기 시간 |
| Kafka `request.timeout.ms` | `15,000` ms | 요청 타임아웃 15초 |

**Bronze 완료 이벤트 발행**:
```
Topic: airader.pipeline.bronze.done
Payload: {"event_type": "pipeline.bronze.done", "source_type": "news|paper|github", "timestamp": "ISO8601"}
→ ExternalTaskSensor가 이를 감지하여 Silver DAG 자동 트리거
```

---

### 3.2 SilverRefinementJob 설정값

| 설정 항목 | 값 | 설명 |
| --- | --- | --- |
| AI 배치 크기 | `10`건 | 환경변수 `AI_BATCH_SIZE` |
| AI 동시 파티션 | `10` | 환경변수 `AI_SERVER_CONCURRENCY` |
| HTTP 연결 타임아웃 | `5`초 | RequestConfig connectionRequestTimeout |
| HTTP 응답 타임아웃 | `600`초 (10분) | 임베딩 생성 포함 |
| Execution timeout | `12`시간 | Airflow DAG default_args |

**Anti-join 미처리분 추출 로직**:
```java
// Bronze에서 읽은 전체 중, Silver에 이미 있는 ID를 제외
Dataset<Row> alreadyProcessed = spark.read().format("delta")
    .load(silverPath)
    .select("article_id");

Dataset<Row> toProcess = bronze
    .join(alreadyProcessed,
          bronze.col("article_id").equalTo(alreadyProcessed.col("article_id")),
          "left_anti");  // anti-join: Silver에 없는 것만
```

**GitHub AI 관련도 자동 필터**:
```java
// topics 배열에 AI 키워드 포함 여부
AI_TOPIC_KEYWORDS = {"ai", "ml", "llm", "deep-learning", "generative-ai",
                     "transformer", "rag", "agent", "diffusion", "gpt", ...}
// description/repo_name 텍스트 매칭
AI_WORD_PATTERN = "\\b(ai|ml|llm|nlp|rag)\\b"
```

---

### 3.3 GoldServingJob 설정값

| 설정 항목 | 값 | 설명 |
| --- | --- | --- |
| JDBC batchsize | `1,000`건 | PostgreSQL JDBC 배치 인서트 단위 |
| JDBC numPartitions | `8` | 동시 DB 연결 수 |
| SaveMode | `Overwrite` | Staging 테이블 전체 교체 |
| Upsert 충돌 키 | `article_id` / `paper_id` / `repo_id` | ON CONFLICT 기준 |

---

### 3.4 CollaborativeFilteringJob (ALS) 설정값

| 설정 항목 | 값 | 설명 |
| --- | --- | --- |
| 데이터 기간 | 최근 `30`일 | `search_logs` 조회 범위 |
| 최소 사용자 수 | `5`명 | 미만 시 학습 Skip |
| 최소 아이템 수 | `10`개 | 미만 시 학습 Skip |
| 추천 Top-N | `20`개/사용자 | `user_recommendations` 저장 수 |
| ALS MaxIter | `10`회 | 학습 반복 횟수 |
| ALS Rank | `10` | 잠재 인수 차원 수 |
| ALS RegParam | `0.1` | L2 정규화 계수 |
| ALS ImplicitPrefs | `true` | 클릭/조회를 암묵적 선호도로 처리 |
| ColdStartStrategy | `drop` | 학습에 없는 아이템 제외 |
| 추천 만료 | `3`일 | `expires_at = NOW() + INTERVAL '3 days'` |

**이벤트 가중치 설계 근거**:
```
ARTICLE_VIEWED    → 1.0  (30초 이상 체류 시만 기록 — 가벼운 관심)
ARTICLE_SEARCHED  → 2.0  (의도적 탐색 — 중간 관심)
ARTICLE_LIKED     → 3.0  (명시적 긍정 반응)
ARTICLE_BOOKMARKED → 5.0  (나중에 다시 보려는 강한 관심)
```

---

## 4. AI 분석 시스템

### 4.1 AI 서버 동시성 설계

```python
# main.py
_semaphore = asyncio.Semaphore(2)  # 최대 동시 요청 2개
# → LLM 추론 메모리 보호 (로컬 모델 OOM 방지)

NEWS_CHUNK_SIZE = int(os.getenv("NEWS_CHUNK_SIZE", "2"))    # 기본 2건씩 (뉴스는 content 길이 ↑)
PAPER_CHUNK_SIZE = int(os.getenv("PAPER_CHUNK_SIZE", "3"))  # 기본 3건씩 (abstract가 더 짧아 배치 크기 ↑)
```

| 설정 | 기본값 | 환경변수 | 설명 |
| --- | --- | --- | --- |
| Semaphore | `2` | — | 최대 동시 처리 요청 수 |
| 뉴스 chunk size | `2` | `NEWS_CHUNK_SIZE` | LLM 1회 호출당 뉴스 건수 |
| 논문 chunk size | `3` | `PAPER_CHUNK_SIZE` | LLM 1회 호출당 논문 건수 (abstract 짧아 3건 가능) |

**뉴스 배치 엔드포인트 처리 흐름**:
```
POST /analyze/news/batch (n건 수신)
    ↓
chunk_size(2)씩 분할
    ↓ (비동기 병렬, but Semaphore로 최대 2개 동시)
[chunk 1] → LLM 분석 → 임베딩 생성 → DB 저장
[chunk 2] → LLM 분석 → 임베딩 생성 → DB 저장
    ↓
결과 병합 → 분석 결과만 반환 (임베딩 미포함)
```

---

### 4.2 LLM 프롬프트 설계

**뉴스 분석 입력 제한**:
```
content: 최대 800자 (토큰 절약)
임베딩용 텍스트: title + content[:500]
```

**뉴스 분석 출력 스펙**:
```json
{
  "article_id": "string",
  "sentiment": "POSITIVE | NEGATIVE | NEUTRAL",
  "keywords": ["최대 5개", "영소문자"],
  "score": 0.0,          // 0.0~1.0 (AI/기술 관련도)
  "summary": "string",   // 3-4문장, 영어
  "category": "LLM | Vision | NLP | RL | Multimodal | Robotics | Semiconductor | Cloud | ETC",
  "region": "DOMESTIC | GLOBAL",
  "companies": ["공식 회사명 (영문)"]
}
```

**논문 분석 입력 제한**:
```
abstract: 최대 300자
임베딩용 텍스트: title + abstract[:500]
```

**논문 분석 출력 스펙**:
```json
{
  "paper_id": "string",
  "keywords": ["최대 5개"],
  "summary": "string",       // 2-3문장, 최대 80단어, 영어
  "category": "Vision | NLP | RL | Multimodal | Robotics | ETC",
  "research_area": "cs.AI | cs.LG | cs.CV | cs.CL | cs.RO | cs.NE"
}
```

---

### 4.3 JSON 파싱 안정성 처리

LLM 출력이 불완전한 경우 대응 로직:

```python
def _parse_json_response(raw: str) -> list[dict]:
    # 1단계: 코드블록 제거 (```json ... ``` 형식)
    # 2단계: JSON 배열 시작 위치 찾기 ([)
    # 3단계: json.loads() 완전 파싱 시도
    # 4단계 (실패 시): depth 추적으로 완전히 닫힌 객체만 추출
    #   - '{' → depth+1, '}' → depth-1
    #   - depth==0인 시점까지의 문자열만 파싱
    # 5단계 (여전히 실패): ValueError 발생 → 배치 전체 error_log 기록
```

---

### 4.4 임베딩 저장 (psycopg2 Upsert)

```python
# db.py
INSERT INTO content_embeddings (content_id, content_type, embedding)
VALUES (%s, %s, %s::vector)
ON CONFLICT (content_id)
DO UPDATE SET
    embedding = EXCLUDED.embedding,
    updated_at = NOW()
```

---

### 4.5 GMS 프록시 vs 로컬 모델 전환

```python
# analyzer.py — 전환 방법
# GMS 사용 시:
result = await self._call_claude(prompt)

# 로컬 Qwen 사용 시:
result = await self._call_local(prompt)
```

**로컬 Qwen 2.5-3B 설정**:
```python
LLM_QUANTIZATION = "4bit"       # 메모리 절약
LLM_MAX_NEW_TOKENS = 1024
LLM_TEMPERATURE = 0.1           # 낮은 온도 → 일관된 JSON 출력
torch_dtype = torch.float16
device_map = "auto"             # GPU/CPU 자동 배치
```

---

## 5. 추천 시스템

### 5.1 점수 산정 공식

**뉴스 추천 점수** (ALS 결과 있을 때):
```
final_score = ALS_score × 0.4
            + Σ(keyword_weight) × 0.3
            + exp(-0.01 × hours_old) × 0.2     // 시간 감쇠
            + ai_analysis_score × 0.1
```

**뉴스 추천 점수** (ALS 결과 없을 때 — Cold Start):
```
final_score = Σ(keyword_weight) × 0.5
            + exp(-0.01 × hours_old) × 0.3
            + ai_analysis_score × 0.2
```

**논문 추천 점수** (ALS 결과 있을 때):
```
final_score = ALS_score × 0.4
            + Σ(keyword_weight) × 0.3
            + exp(-0.05 × days_old) × 0.3       // 뉴스보다 느린 감쇠
```

> **논문 감쇠 계수(0.05) vs 뉴스(0.01)**: 논문은 뉴스보다 오래 유효한 정보이므로 감쇠를 더 빠르게 적용하지 않는다.

---

### 5.2 서빙 우선순위 (4단계 Fallback)

```
1순위: Redis 캐시 TTL 30분 → Cache HIT → 즉시 반환 (~1ms)
2순위: user_recommendations (ALS 배치 결과)
       + user_interests (관심 키워드 기반 필터링)
       → 재랭킹 후 반환 (~50ms)
3순위: user_interests만으로 키워드 매칭
       → PostgreSQL keywords && 배열 교집합 쿼리 (~100ms)
4순위: Cold Start Fallback
       → 최근 7일 Top-20 인기 기사 (score 내림차순) (~80ms)
```

**Redis 프로파일 갱신 기준**:
```
ARTICLE_VIEWED (30초 이상 체류):  kw:{keyword} += 1.0
ARTICLE_LIKED:                   kw:{keyword} += 5.0
ARTICLE_BOOKMARKED:              kw:{keyword} += 10.0
ARTICLE_SEARCHED (article 포함): kw:{keyword} += 2.0

Top 키워드 추출: Hash에서 가중치 상위 10개 선택
```

**PostgreSQL 배열 교집합 쿼리**:
```sql
-- Spring Data JPA nativeQuery (일반 JPQL 불가)
SELECT * FROM news_items
WHERE keywords && CAST(:keywords AS TEXT[])
  AND published_at > :since
ORDER BY score DESC
LIMIT :limit

-- 파라미터 형식: {"keyword1","keyword2"} (PostgreSQL 배열 리터럴)
```

---

### 5.3 후보 생성 → 재랭킹 흐름

```
1. 상위 키워드 10개 추출 (Redis 프로파일)
2. 후보 기사 조회: LIMIT = 요청 크기 × 5 (후보 풀 5배 확보)
3. ALS 점수 반영: user_recommendations에서 해당 기사 점수 조회
4. 최신성 감쇠 적용: exp(-0.01 × hours_old)
5. 조회 이력 필터링: 이미 본 기사 제거 (Redis art:{articleId})
6. 최종 정렬 후 상위 N개 반환
7. Redis 캐시 저장 (TTL 30분)
```

---

## 6. 성능 수치 및 튜닝

### 6.1 API 응답 시간 목표

| 엔드포인트 | 목표 | 달성 방법 |
| --- | --- | --- |
| 뉴스/논문 목록 | p95 < 500ms | PostgreSQL 인덱스 + 페이지네이션 |
| 벡터 유사도 검색 | p95 < 1,000ms | IVFFlat 인덱스 (lists=100) |
| 개인화 추천 (캐시 HIT) | p95 < 100ms | Redis TTL 30분 |
| 이벤트 수신 | < 50ms | @Async fire-and-forget, 202 즉시 반환 |

---

### 6.2 메모리 설정 요약

| 컴포넌트 | 설정값 | 근거 |
| --- | --- | --- |
| Spark executor memory | `2g` | 배치 처리 충분 |
| Spark driver memory | `1g` | Silver/Gold Job 기준 |
| Airflow 컨테이너 mem_limit | **`6g`** | driver(~1.4g) + Airflow(~800MB) + 여유분 |
| Gradle JVM `-Xmx` | `1,536m` | OOM 방지 (감소 금지) |
| Gradle MetaSpace | `512m` | Spark + Spring 클래스 로딩 |
| ALS executor memory | `2g` | 행렬 분해 연산 |

> **OOM Kill 진단**: Error code -9 = SIGKILL = OOM Killer 동작
> `docker inspect <container> | grep Memory` 로 컨테이너 메모리 한도 먼저 확인

---

### 6.3 Airflow DAG 전체 목록 (9개)

| DAG ID | 스케줄 | 역할 |
| --- | --- | --- |
| `crawl_news_to_kafka` | `*/30 * * * *` | AITimes·GDELT 뉴스 크롤링 → Kafka |
| `crawl_paper_to_kafka` | `*/30 * * * *` | arXiv 논문 크롤링 → Kafka |
| `crawl_github_to_kafka` | `0 */3 * * *` | GitHub Archive 크롤링 → Kafka |
| `bronze_kafka_ingestion` | `@hourly` | Kafka → Bronze Delta Lake |
| `silver_refinement` | `None` (수동) | Bronze → Silver (AI 분석) |
| `gold_serving` | `None` (수동) | Silver → Gold PostgreSQL |
| `recommendation_batch` | `0 2 * * *` | ALS 협업 필터링 |
| `trend_aggregator_daily` | `0 2 * * *` | 키워드 트렌드 집계 |
| `wordcloud_weekly` | `0 3 * * 1` | 주간 워드클라우드 생성 |

---

### 6.4 파이프라인 처리 시간 (실측 기준)

| 단계 | 처리 건수 | 소요 시간 |
| --- | --- | --- |
| Bronze 적재 (Kafka → Delta Lake) | 50건 | ~1분 |
| Silver AI 분석 (뉴스 10건/배치) | 50건 | ~10~20분 |
| Gold Upsert (JDBC batchsize=1,000) | 50건 | ~30초 |
| ALS 학습 (30일 로그, 10명↑) | — | ~3~5분 |

---

### 6.5 Kafka 처리량 설정

| 설정 | 값 | 설명 |
| --- | --- | --- |
| `acks` | `all` | 모든 레플리카 쓰기 확인 (데이터 유실 방지) |
| `retries` | `3` | 발행 실패 재시도 |
| `linger.ms` | `50` ms | 배치 대기 시간 (50ms 이내 메시지 묶음) |
| `request.timeout.ms` | `15,000` ms | 요청 타임아웃 15초 |

---

### 6.6 JWT 토큰 만료 설정

```
Access Token:  900,000 ms  (15분)
Refresh Token: 604,800,000 ms (7일)
Redis refresh:{userId} TTL: 7일 (Refresh Token과 동기화)
```

---

## 7. 트러블슈팅 사례

### 7.1 Spark ↔ Hibernate ANTLR 버전 충돌

**문제**:
Spark 3.5.0은 ANTLR 4.9.3을 사용하고, Spring Boot 3.3.5 (Hibernate 6.x)는 ANTLR 4.13.x를 요구한다. 두 의존성이 같은 JVM에 로드되면 ClassLoader 충돌이 발생한다.

**증상**:
```
NoSuchMethodError: org.antlr.v4.runtime.atn.PredictionContext.isEmpty()
java.lang.ClassCastException: class org.antlr.v4.runtime.misc.MurmurHash
```

**해결**:
```groovy
// build.gradle — 절대 제거 금지
configurations.all {
    exclude group: 'org.antlr', module: 'antlr4'
    exclude group: 'org.antlr', module: 'antlr4-runtime'
    resolutionStrategy {
        force 'org.antlr:antlr4-runtime:4.9.3'  // Spark 버전으로 고정
    }
}
```

**검증 명령**:
```bash
cd AIRadar/backend && ./gradlew dependencies | grep antlr
# 출력에 antlr4-runtime:4.9.3 만 있어야 정상
```

**추가 조치**: Spark 의존성을 `compileOnly` 스코프로 설정하여 bootJar에서 제외, shadowJar(Fat JAR)에만 포함.

---

### 7.2 Airflow 컨테이너 OOM Kill (Exit Code -9)

**문제**:
Airflow LocalExecutor에서 SparkSubmitOperator 실행 시, Spark driver JVM이 Airflow 컨테이너 내부에서 기동된다. 컨테이너 메모리 한도가 부족하면 OOM Killer가 작동하여 컨테이너가 -9로 강제 종료된다.

**오해**: `spark.executor.memory`를 줄여도 해결되지 않는다. executor는 별도 컨테이너에서 실행되기 때문.

**실제 원인**: `spark.driver.memory=1g` 기준, Airflow 컨테이너 안에서 driver JVM이 실제로 ~1.4GB를 차지한다.

**메모리 계산**:
```
Airflow 프로세스:    ~800MB
Spark driver JVM:   ~1,400MB (1g 설정 + JVM 오버헤드)
여유 버퍼:          ~1,000MB
────────────────────────────
최소 필요:           ~3,200MB → 안전하게 6g 설정
```

**해결**:
```yaml
# docker-compose.yml
airflow:
  mem_limit: 6g
```

**진단 명령**:
```bash
docker inspect server1-airflow | grep -i memory
# "Memory": 6442450944  ← 6GB = 정상
# "Memory": 0           ← 제한 없음 (잠재적 위험)
```

---

### 7.3 Silver/Gold 0건 처리 (Batch Date 불일치)

**문제**:
Silver Job의 `--date` 파라미터와 Bronze의 `batch_date` 파티션이 일치하지 않아 anti-join 결과가 0건이 되는 상황.

**원인 1 — 날짜 불일치**:
```
Bronze: batch_date=2026-03-19  (크롤링된 날)
Silver DAG: --date={{ ds }} = 2026-03-20  (DAG 실행일)
→ 파티션 미스매치 → 처리 대상 0건
```

**원인 2 — 논문 published_at 버그**:
```java
// 잘못된 코드:
String batchDate = article.getPublishedAt().substring(0, 10); // "2026-03-01" (수주 전)

// 올바른 코드:
String batchDate = new SimpleDateFormat("yyyy-MM-dd")
    .format(new Date(kafkaRecord.timestamp())); // Kafka 수신 시각
```
arXiv 논문은 `published_at`이 실제 발행일(수일~수주 전)이므로, Silver Job의 `--date`(당일)와 불일치하여 0건 처리.

**디버깅 체크리스트**:
```bash
# 1. Bronze 파티션 실제 존재 여부 확인
aws s3 ls s3://airadar/bronze/paper/ | grep batch_date

# 2. Silver Job 로그에서 미처리분 확인
docker logs airflow | grep "미처리 건수"

# 3. AI 서버 연결 확인
curl http://localhost:8000/health

# 4. Gold error_log 확인
psql -c "SELECT COUNT(*) FROM news_items WHERE error_log IS NOT NULL"
```

---

### 7.4 Airflow Manual Trigger 충돌 (DagRunAlreadyExists)

**문제**:
`@hourly` 스케줄 DAG는 매 시간 scheduled run이 이미 존재한다. 같은 시간대에 수동 트리거하면 `DagRunAlreadyExists` 에러 발생.

**해결**:
```bash
# Airflow DB에 직접 접근하여 충돌 run 삭제
docker exec -it airflow airflow db shell
SET search_path TO airflow;
DELETE FROM dag_run
WHERE dag_id = 'silver_refinement'
  AND run_id = 'scheduled__2026-03-20T12:00:00+00:00';
```

**예방**: Silver/Gold DAG는 `schedule_interval=None`으로 설정하여 수동 트리거만 허용.

---

### 7.5 GMS API 만료 대응

**증상**: AI 서버 로그에 `Connection timed out` (HTTP 401 아님)

GMS 프록시가 만료되면 응답 없이 타임아웃이 발생한다. HTTP 상태코드로는 구분이 어렵다.

**대응 흐름**:
```
1. GMS 키 만료 감지 → AI 서버 로그 "배치 분석 실패: Connection timed out"
2. analyzer.py에서 _call_claude → _call_local 전환 (로컬 Qwen 2.5-3B)
3. GMS 키 갱신 → 환경변수 GMS_KEY 업데이트
4. 실패했던 날짜로 Silver DAG 재트리거 → replaceWhere로 실패 건 자동 재처리
5. 로컬 Qwen → Claude 재전환 (동일 파일에서 주석 교체)
```

**재처리 명령**:
```bash
# Airflow에서 특정 날짜로 재트리거
docker exec airflow airflow dags trigger silver_refinement \
  --conf '{"date": "2026-03-20", "reprocess": true}'
```

---

### 7.6 docker-compose --force-recreate 버그

**문제**: Docker Compose 1.29.2에서 `--force-recreate` 플래그 사용 시 `KeyError: 'ContainerConfig'` 에러 발생.

**해결**:
```bash
# 금지
docker compose up -d --force-recreate

# 올바른 방법
docker compose stop <service>
docker compose rm -f <service>
docker compose up -d <service>
```

---

### 7.7 arXiv 크롤링 타임아웃

**문제**: `CRAWLER_TIMEOUT_SEC=15` (기본값) + `max_results=200`으로 arXiv API 호출 시 `ReadTimeout` 발생.

**원인**: arXiv API는 결과 건수가 많을수록 응답 시간이 증가한다. 200건 응답은 15초를 초과하는 경우가 빈번.

**해결**:
```bash
# .env 설정
CRAWLER_TIMEOUT_SEC=60  # 최소 60초 이상
```

---

### 7.8 GH Archive 크롤링 데이터 없음

**문제**: `github_window_minutes=30`으로 설정 시 GitHub Archive 데이터가 0건.

**원인**: GH Archive는 실시간이 아니라 약 1시간 지연되어 업로드된다.

**해결**:
```bash
# .env 설정
GITHUB_WINDOW_MINUTES=180  # 최소 180분 이상
```

---

### 7.9 Jenkins Deploy OOM

**문제**: Jenkinsfile Deploy 단계에서 `tar --exclude=.git -czf - . | ssh` 방식으로 전체 소스 전송 시 Jenkins 컨테이너가 OOM으로 종료.

**원인**: 전체 소스를 tar로 압축하면 메모리 사용량이 급증. `node_modules`, Delta Lake 파일 포함 시 수GB.

**해결**:
```bash
# JAR 파일 + 필수 설정 파일만 scp로 전송
scp AIRadar/backend/build/libs/airadar.jar user@server:/app/
scp AIRadar/infra/docker-compose.server1.yml user@server:/app/
```

**Jenkins 설정**:
```
docker-compose.server1.yml mem_limit: 4g
gradle.properties: -Xmx1024m
JAVA_OPTS: -Xmx768m
```

---

## 8. 보안 설계

### 8.1 JWT 인증 흐름

```
로그인 → Access Token (15분) + Refresh Token (7일, Redis 저장)
          ↓
Access Token 만료 → POST /auth/refresh
          ↓
Refresh Token Rotation: 이전 토큰 즉시 무효화 + 새 토큰 발급
(Refresh Token 탈취 후 재사용 방어)
```

### 8.2 공개/인증 경로 분리

**인증 불필요**:
```
/api/v1/auth/**         뉴스·논문·GitHub·대시보드 GET
/api/v1/recommendations/trending/**
POST /api/v1/events/search
```

**인증 필요**:
```
/api/v1/users/me/**
/api/v1/recommendations/news
/api/v1/recommendations/papers
POST /api/v1/events/article-view|like|bookmark
```

### 8.3 자격증명 관리

| 항목 | 방법 |
| --- | --- |
| DB 비밀번호 | 환경변수만 (코드 하드코딩 금지) |
| GMS_KEY | 환경변수, `.env` 커밋 금지 |
| MinIO 자격증명 | `getOrDefault()` — 기본값은 로컬 개발 전용 |
| JWT 서명 키 | 환경변수 `JWT_SECRET` |
| `.env` 파일 | `.gitignore` 포함, `.env.example`만 커밋 |

### 8.4 SQL Injection 방어

- JPA: 파라미터 바인딩 (PreparedStatement 자동 적용)
- Native Query: `:keyword` 네이밍 바인딩
- Spark JDBC: `PreparedStatement` 사용

---

## 부록: 주요 포트 및 엔드포인트

| 서비스 | 포트 | 주요 엔드포인트 |
| --- | --- | --- |
| Spring Boot | 8888 | `/api/v1/**`, `/health` |
| Next.js | 3000 | `/dashboard`, `/news`, `/jobs` |
| AI Server | 8000 | `/analyze/news/batch`, `/analyze/paper/batch`, `/health` |
| Crawling Server | 8002 | `/crawl/jobs`, `/crawl/dummy` |
| Airflow UI | 8081 | DAG 관리 |
| Spark Master UI | 8080 | 클러스터 상태 |
| Spark UI | 4040 | Job 모니터링 |
| MinIO Console | 9001 | 버킷/오브젝트 확인 |
| PostgreSQL | 5432 | — |
| Kafka | 9092 / 29092 | `airader.raw.*` 토픽 |
| Redis | 6379 | — |

---

*이 문서는 실제 코드베이스에서 추출한 설정값과 트러블슈팅 사례를 기반으로 작성되었습니다.*
