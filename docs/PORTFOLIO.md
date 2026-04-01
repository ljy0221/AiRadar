# 포트폴리오 — AiRadar 프로젝트

> **[이름]** | [이메일] | [GitHub URL] | SSAFY 14기

**핵심 기술**: Apache Spark · Delta Lake · Apache Kafka · Airflow · Python FastAPI · Spring Boot · PostgreSQL/pgvector · Redis

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [담당 역할 및 기여](#2-담당-역할-및-기여)
3. [기술적 도전과 해결](#3-기술적-도전과-해결)
4. [성과 요약](#4-성과-요약)
5. [기술 스택](#5-기술-스택)
6. [프로젝트 링크](#6-프로젝트-링크)

---

## 1. 프로젝트 개요

### AiRadar — 실시간 AI 기술 인텔리전스 플랫폼

AI 기술 동향을 추적하려면 뉴스 사이트, 논문 데이터베이스, GitHub을 따로 방문해야 하는 불편함이 있다.
AiRadar는 이 세 가지 소스를 **자동 수집 → AI 분석 → 개인화 추천**으로 통합하여 한 곳에서 제공하는 플랫폼이다.

| 항목 | 내용 |
| --- | --- |
| **기간** | 2026년 1월 ~ 3월 (약 7~10주) |
| **팀 규모** | 6명 (프론트엔드 2명, 백엔드/파이프라인 2명, 풀스택 2명) |
| **본인 포지션** | **팀장** / 데이터 파이프라인 · AI 서버 · Spring Boot 백엔드 |
| **프로젝트 성격** | SSAFY 14기 빅데이터 분산 트랙 팀 프로젝트 |

### 핵심 성과 요약

- Lambda Architecture + Medallion Architecture(Bronze→Silver→Gold) 기반 **실시간 데이터 파이프라인 전체를 설계·구현**했다.
- Spark 3.5.0과 Spring Boot 3.3.5의 ANTLR 버전 충돌, Airflow OOM Kill 등 **복잡한 인프라 이슈를 근본 원인 분석으로 해결**했다.
- 협업 필터링(ALS) + 4단계 Fallback 구조로 **신규 사용자 포함 전 사용자에게 개인화 추천**을 제공하는 시스템을 구축했다.

---

## 2. 담당 역할 및 기여

### 2-1. 시스템 아키텍처 설계 (팀장 주도)

프로젝트 초기, 전체 데이터 흐름을 설계하고 기술 스택을 선정했다.

**Lambda + Medallion Architecture 도입 배경**

실시간 수집(Kafka)과 정확한 AI 배치 분석(Spark)을 분리하면서도 데이터를 단계별로 정제해야 하는 요구사항이 있었다. Claude Haiku를 실시간으로 호출하면 API 비용과 레이턴시가 급증하기 때문에, 배치로 묶어 10건씩 처리하는 구조가 비용·성능 모두에서 최적이었다.

```
Speed Layer:  크롤링 서버 → Kafka (30분 주기 수집)
Batch Layer:  Bronze(원본) → Silver(AI 분석) → Gold(서빙용 DB)
Serving Layer: PostgreSQL + Redis → Spring Boot → Next.js
```

**핵심 기술 선정 이유**

| 기술 | 선정 이유 |
| --- | --- |
| **Apache Spark 3.5.0** | Delta Lake 공식 통합 + ALS 협업 필터링을 단일 생태계에서 처리 가능 |
| **Delta Lake 3.1.0** | `replaceWhere` Overwrite로 멱등 재처리 보장 (같은 날짜 재실행 시 동일 결과) |
| **PostgreSQL + pgvector** | 전용 벡터 DB 추가 없이 768차원 유사도 검색 가능 (인프라 단순화) |
| **Apache Kafka** | Spark Structured Streaming과 네이티브 통합 + 메시지 보존으로 재처리 가능 |
| **Redis** | Hash(유저 프로파일), Sorted Set(트렌딩), String(JWT 캐시) 자료구조별 최적화 |

**멀티 서버 환경 설계**

서비스 가용성을 위해 두 서버의 역할을 분리했다.

- **server1** (172.26.3.32): Kafka, Spark, Airflow, Jenkins, Crawling Server — 데이터 처리 전담
- **server2** (172.26.5.50): PostgreSQL(15432), Redis(16379), AI Server(18000) — 서빙 전담

---

### 2-2. 데이터 파이프라인 구현

4개의 Spark Job과 Airflow DAG 전체를 단독으로 구현했다.

#### KafkaBronzeConsumerJob — 원본 데이터 적재

Kafka에서 뉴스·논문·GitHub 데이터를 읽어 Delta Lake(MinIO)에 **원본 그대로** 저장한다.

- **Structured Streaming + `AvailableNow()` Trigger**: 배치 모드로 현재까지 쌓인 메시지를 처리 후 자동 종료. 무한 스트리밍 대신 배치 주기에 맞게 실행.
- **Immutable Bronze**: 원본 데이터는 절대 수정하지 않는다. AI 모델 업그레이드나 버그 발견 시 Silver부터 재처리 가능.
- **Checkpoint 관리**: Kafka 오프셋을 파일 시스템에 저장하여 중복 처리 방지.
- **완료 이벤트 발행**: `airader.pipeline.bronze.done` 토픽으로 Silver DAG 자동 트리거.

```
Bronze 경로: s3a://airadar/bronze/{source_type}/batch_date={date}/
             ← batch_date는 kafka_timestamp 기준 (published_at 아님)
```

#### SilverRefinementJob — AI 분석 및 정제

Bronze 데이터를 AI 서버로 보내 분석하고, 결과를 Silver 레이어에 저장한다.

**Anti-join 증분 처리**: 이미 Silver에 처리된 ID를 제외하고 미처리 건만 AI 분석 요청. 재처리 시 `--reprocess` 플래그로 전체 재분석.

```java
// 핵심: Silver에 없는 레코드만 추출 (left_anti join)
Dataset<Row> toProcess = bronze.join(existingSilver, "left_anti");
```

**AI 배치 호출 설계**

| 설정 | 값 | 이유 |
| --- | --- | --- |
| 배치 크기 | 10건/호출 | API 호출 횟수 최소화, LLM 컨텍스트 한도 고려 |
| 동시 파티션 | 10개 | Spark 병렬 처리와 AI 서버 부하 균형 |
| HTTP 응답 타임아웃 | 600초 | LLM 분석 + 임베딩 생성 시간 포함 |

**Fail-Soft 에러 격리**: AI 서버 장애 시 해당 배치만 `error_log`에 기록하고 파이프라인 계속 진행. 전체 중단 없음.

**멱등성 보장**: `replaceWhere='batch_date=YYYY-MM-DD'`로 해당 파티션만 덮어쓰기. 동일 날짜로 재실행해도 항상 같은 결과.

#### GoldServingJob — PostgreSQL 서빙 테이블 적재

Silver 데이터를 PostgreSQL에 Upsert하는 과정에서 **Staging 패턴**을 설계했다.

Spark JDBC Writer는 `ON CONFLICT ... DO UPDATE` 구문을 직접 지원하지 않는다. 이를 해결하기 위해 staging 테이블 경유 방식을 설계했다.

```
Spark → news_items_staging (OVERWRITE, batchsize=1,000, numPartitions=8)
              ↓ 단일 트랜잭션
        BEGIN;
        INSERT INTO news_items
          SELECT * FROM news_items_staging
          ON CONFLICT (article_id) DO UPDATE SET ...;
        TRUNCATE news_items_staging;
        COMMIT;
```

이로써 부분 적재 상태 없이 원자적 Upsert를 달성했다.

#### Airflow DAG — 오케스트레이션

Silver DAG와 Gold DAG를 설계하고, 두 DAG의 의존성 체인을 구성했다.

```python
# Silver DAG 순서 (Spark driver OOM 방지를 위해 순차 실행)
wait_for_bronze >> refine_news >> refine_paper >> refine_github >> refresh_view
```

- **ExternalTaskSensor**: Bronze 완료 이벤트 감지 후 Silver 자동 트리거
- `max_active_runs=1`: 동시 Spark Job 실행 방지 (OOM 예방)
- `execution_timeout=12h`: AI 배치 처리에 충분한 여유 시간 확보
- `catchup=False`: 과거 누락분 자동 재처리 금지

---

### 2-3. AI 서버 구현 (Python FastAPI)

Python FastAPI 기반 AI 분석 서버를 단독으로 구현했다.

**전체 처리 흐름**

```
POST /analyze/news/batch (n건 수신)
    ↓ chunk_size(2)씩 분할
    ↓ Semaphore(2)로 최대 2개 동시 처리 (LLM 메모리 보호)
[chunk 1] → Claude Haiku 분석 → 임베딩 생성 → content_embeddings DB 직접 저장
[chunk 2] → Claude Haiku 분석 → 임베딩 생성 → content_embeddings DB 직접 저장
    ↓ 결과 병합 → 분석 결과만 Spark에 반환 (임베딩 미포함)
```

**임베딩을 Spark 파이프라인 밖에서 처리한 이유**: Spark JDBC는 `vector(768)` 타입을 직접 쓸 수 없고, 768차원 벡터를 DataSet으로 직렬화·전송하면 성능 저하가 크다. AI 서버가 `content_embeddings` 테이블에 직접 Upsert하는 구조로 분리했다.

**LLM 분석 스펙**

- **뉴스**: sentiment(POSITIVE/NEGATIVE/NEUTRAL), keywords(최대 5개), score(0~1), summary(3-4문장), category, region(DOMESTIC/GLOBAL), companies
- **논문**: keywords(최대 5개), summary(최대 80단어), category(Vision/NLP/RL/Multimodal 등), research_area(cs.AI/cs.LG 등)
- content 입력: 최대 800자 (토큰 절약), 임베딩용: title + content[:500]

**JSON 파싱 복구 로직**: LLM 출력이 잘린 경우를 대비해 depth 추적으로 완전히 닫힌 객체만 추출하는 2단계 파싱 로직을 구현했다.

**폴백 구현**: GMS 프록시 만료 시 로컬 Qwen 2.5-3B (4bit quantization)으로 무중단 전환. `_call_claude()` ↔ `_call_local()` 주석 교체만으로 전환 가능하게 설계.

---

### 2-4. Spring Boot 추천 서비스 기여

RecommendationService의 점수 산정 공식과 Fallback 로직을 설계·구현했다.

**추천 서빙 4단계 Fallback**

```
1순위: Redis 캐시 (TTL 30분)           → Cache HIT 시 ~1ms 응답
2순위: ALS 배치 결과 + 키워드 필터링   → DB 조회 + 재랭킹
3순위: 관심 키워드 기반 콘텐츠 필터링  → PostgreSQL keywords && 배열 교집합
4순위: Cold Start Fallback             → 최근 7일 인기 기사 Top-20
```

**결합 점수 공식 (뉴스, ALS 있을 때)**

```
score = ALS_score × 0.4
      + Σ(keyword_weight) × 0.3
      + exp(-0.01 × hours_old) × 0.2    ← 최신성 감쇠
      + ai_analysis_score × 0.1
```

논문은 감쇠 계수를 `exp(-0.05 × days_old)`로 다르게 설정했다. 뉴스보다 논문이 오래 유효한 정보이기 때문이다.

**협업 필터링(ALS) 설계**

| 파라미터 | 값 | 설계 근거 |
| --- | --- | --- |
| 학습 데이터 기간 | 최근 30일 | 장기 이력보다 최근 행동이 선호도를 더 잘 반영 |
| Rank | 10 | 메모리 vs 표현력 균형 |
| RegParam | 0.1 | 과적합 방지 L2 정규화 |
| ImplicitPrefs | true | 클릭/조회를 암묵적 선호도로 처리 |
| 이벤트 가중치 | 조회=1, 검색=2, 좋아요=3, 북마크=5 | 사용자의 의도 강도를 수치로 반영 |
| Top-N | 20개/사용자 | 충분한 후보군 확보 |

**@Async 이벤트 처리**: 사용자 이벤트(조회·좋아요·북마크·검색)는 `fire-and-forget`으로 즉시 202를 반환하고, 비동기로 Redis 프로파일과 DB에 기록. API 응답 지연 없음.

---

## 3. 기술적 도전과 해결

### 3-1. Spark ↔ Hibernate ANTLR 버전 충돌

**문제**

Spring Boot 3.3.5(Hibernate 6.x)는 ANTLR 4.13.x를, Spark 3.5.0은 ANTLR 4.9.3을 요구한다. 두 라이브러리가 같은 JVM에 로드되면 `ClassCastException`이 발생하여 빌드 자체가 불가능한 상황이었다.

```
NoSuchMethodError: org.antlr.v4.runtime.atn.PredictionContext.isEmpty()
ClassCastException: class org.antlr.v4.runtime.misc.MurmurHash
```

**원인 분석**

Gradle 의존성 트리를 분석해 두 라이브러리가 서로 다른 ANTLR 버전을 전이 의존성으로 끌어오는 것을 확인했다. 단순히 버전을 강제 지정하면 Hibernate 쿼리 파서가 동작하지 않는 문제가 생겼다.

**해결**

ANTLR을 의존성 트리에서 완전히 제거하고, Spark 전용 버전으로 강제 고정하는 방식을 택했다. 동시에 Spark 관련 의존성을 `compileOnly` 스코프로 분리하여 `bootJar`(Spring Boot)와 `shadowJar`(Spark Job)를 완전히 분리했다.

```groovy
// build.gradle
configurations.all {
    exclude group: 'org.antlr', module: 'antlr4'
    exclude group: 'org.antlr', module: 'antlr4-runtime'
    resolutionStrategy {
        force 'org.antlr:antlr4-runtime:4.9.3'  // Spark 버전으로 고정
    }
}

// Spark 의존성은 compileOnly → bootJar에 미포함, shadowJar에만 포함
compileOnly "org.apache.spark:spark-sql_${scalaVersion}:${sparkVersion}"
```

**결과**

빌드 성공. Spring Boot와 Spark Job이 독립 배포 가능한 구조로 정리됐다. 검증 명령(`./gradlew dependencies | grep antlr`)을 CI 체크리스트에 포함시켜 재발을 방지했다.

---

### 3-2. Airflow 컨테이너 OOM Kill (Exit Code -9)

**문제**

Silver DAG 실행 중 Airflow 컨테이너가 Exit Code -9로 강제 종료되는 현상이 반복됐다. -9는 OS OOM Killer가 프로세스를 강제 종료하는 신호다.

**원인 분석 (잘못된 가설과 올바른 원인)**

처음에는 `spark.executor.memory`를 줄이는 방향으로 접근했으나 해결되지 않았다. Executor는 별도 컨테이너에서 실행되기 때문이다.

`docker inspect`로 컨테이너 메모리 한도를 확인하고, Airflow LocalExecutor의 동작 방식을 분석한 결과 원인을 파악했다. **SparkSubmitOperator가 Airflow 컨테이너 내부에서 Spark driver JVM을 기동**하기 때문에, Airflow 프로세스와 driver 메모리가 합산된다.

```
Airflow 프로세스:     ~800MB
Spark driver JVM:    ~1,400MB  (1g 설정 + JVM 오버헤드)
합산:                ~2,200MB  → 기존 mem_limit(2g) 초과
```

**해결**

메모리 계산 근거를 수립하고 `mem_limit: 6g`으로 상향 조정했다. 안전 버퍼를 포함한 근거:

| 구성요소 | 메모리 |
| --- | --- |
| Airflow 프로세스 | ~800MB |
| Spark driver JVM | ~1,400MB |
| 안전 버퍼 | ~800MB |
| **합계 (설정값)** | **~3,000MB → 6g** |

**결과**

OOM Kill 재발 없음. 동시에 `max_active_runs=1`로 동시 Spark Job을 1개로 제한해 메모리 경합을 원천 차단했다.

---

### 3-3. Silver 0건 처리 — batch_date 파티션 불일치

**문제**

Silver Job 실행 후 처리 건수가 0건인 상황이 두 차례 발생했다. AI 서버는 정상, 로그에는 에러 없음.

**원인 분석**

Bronze 파티션 경로를 직접 확인했더니 두 가지 불일치를 발견했다.

**원인 1**: Bronze `batch_date`는 크롤링 당일 날짜, Silver `--date`는 Airflow DAG 실행일. 새벽 00:00 이후 실행 시 날짜가 달라지는 엣지 케이스였다.

```
Bronze: batch_date=2026-03-19  (크롤링된 날)
Silver: --date={{ ds }} = 2026-03-20  (Airflow 실행일)
→ anti-join이 모두 "이미 처리됨"으로 판단 → 0건
```

**원인 2 (논문 특수 케이스)**: arXiv 논문의 `published_at`은 실제 발행일로, 수일~수주 전 날짜다. 이 값을 `batch_date`로 쓰면 Silver Job의 `--date`(당일)와 절대 일치하지 않는다.

```java
// 잘못된 코드:
String batchDate = article.getPublishedAt().substring(0, 10); // "2026-02-28" (과거)

// 수정된 코드:
String batchDate = new SimpleDateFormat("yyyy-MM-dd")
    .format(new Date(kafkaRecord.timestamp())); // Kafka 수신 시각 기준
```

**해결 및 예방**

`batch_date`를 Kafka 수신 시각(`kafka_timestamp`) 기준으로 통일했다. 또한 "Silver 0건" 발생 시 따라야 할 디버깅 체크리스트를 팀 문서에 수립했다.

**결과**

논문 포함 모든 소스 타입에서 파티션 불일치 0건 문제 해소.

---

### 3-4. ALS 추천 시스템 설계 및 Cold Start 문제 해결

**문제**

협업 필터링(ALS)만 사용하면 신규 사용자나 데이터가 부족한 시점에 추천 불가 상태가 발생한다.

**해결: 4단계 Fallback 아키텍처**

어느 단계에서도 추천 결과가 나올 수 있도록 계층 구조를 설계했다.

```
1단계: Redis 캐시 (TTL 30분)
  └─ Cache HIT → 즉시 반환 (~1ms)

2단계: ALS 배치 추천 (매일 새벽 2시 생성)
  └─ user_recommendations 테이블에서 Top-20 조회
  └─ 관심 키워드 가중치로 재랭킹

3단계: 키워드 기반 콘텐츠 필터링
  └─ Redis 프로파일에서 상위 10개 키워드 추출
  └─ PostgreSQL keywords && 배열 교집합 쿼리

4단계: Cold Start Fallback
  └─ 최근 7일 인기 기사 (score 내림차순 Top-20)
```

**ALS 이벤트 가중치 설계 근거**

사용자 행동의 의도 강도를 수치로 반영했다. 30초 미만 체류 조회는 수집하지 않아 노이즈를 줄였다.

| 이벤트 | 가중치 | 근거 |
| --- | --- | --- |
| 기사 조회 (30초↑) | 1.0 | 관심은 있으나 가벼운 신호 |
| 검색 (기사 클릭 포함) | 2.0 | 의도적 탐색 행동 |
| 좋아요 | 3.0 | 명시적 긍정 반응 |
| 북마크 | 5.0 | 나중에 다시 볼 의도 — 가장 강한 신호 |

**결과**

- Cold Start 포함 모든 사용자에게 추천 제공 가능
- Redis 캐시로 반복 요청 ~1ms 응답
- ALS 학습 조건(사용자 5명↑, 기사 10개↑) 미달 시 학습 자동 Skip으로 안정성 확보

---

## 4. 성과 요약

| 항목 | 수치 / 내용 |
| --- | --- |
| 파이프라인 레이어 수 | 3단계 (Bronze → Silver → Gold) |
| 데이터 수집 주기 | 30분 (크롤링 서버), 1시간 (Bronze 적재) |
| 지원 데이터 소스 | 3종 (뉴스: AITimes·GDELT, 논문: arXiv, GitHub Archive) |
| AI 분석 배치 크기 | 10건/API 호출 (LLM 비용 최적화) |
| 임베딩 차원 | 768차원 (paraphrase-multilingual-mpnet-base-v2) |
| 벡터 인덱스 | IVFFlat (lists=100, cosine similarity) |
| 추천 Fallback 단계 | 4단계 (Redis 캐시 → ALS → 키워드 → Cold Start) |
| ALS Top-N | 20개/사용자 (3일 TTL) |
| ALS 이벤트 가중치 설계 | 4종 (1 / 2 / 3 / 5) |
| 추천 캐시 응답 속도 | ~1ms (Redis TTL 30분) |
| 해결한 인프라 이슈 | 4건 (ANTLR 충돌, OOM Kill, 0건 처리, Cold Start) |
| Spark Job 수 | 4개 (KafkaBronze, SilverRefinement, GoldServing, CollaborativeFiltering) |
| Airflow DAG 수 | 9개 (크롤링 3 · 적재 1 · 분석 1 · 서빙 1 · 추천 1 · 트렌드 집계 1 · 워드클라우드 1) |

---

## 5. 기술 스택

### 데이터 파이프라인 (주 담당)

| 기술 | 버전 | 용도 |
| --- | --- | --- |
| Apache Spark | 3.5.0 (Scala 2.12) | Bronze/Silver/Gold Spark Job, ALS 협업 필터링 |
| Delta Lake | 3.1.0 | ACID 트랜잭션, 멱등 재처리 (`replaceWhere`) |
| Apache Kafka | Confluent 7.4.0 | 이벤트 스트리밍 (수집 → Bronze) |
| Apache Airflow | 2.8.3 | DAG 오케스트레이션, SparkSubmitOperator |
| MinIO | latest | S3 호환 오브젝트 스토리지 (Delta Lake 저장소) |
| Apache Hadoop (S3A) | 3.3.4 | MinIO ↔ Spark S3A 연결 |

### AI 서버 (주 담당)

| 기술 | 버전 | 용도 |
| --- | --- | --- |
| Python FastAPI | 3.10+ | AI 분석 서버 엔드포인트 |
| Claude Haiku | claude-haiku-4-5-20251001 | 뉴스·논문 배치 분석 (GMS 프록시) |
| sentence-transformers | — | 768차원 다국어 임베딩 생성 |
| PostgreSQL + pgvector | 16 | 벡터 유사도 검색 (IVFFlat) |
| Qwen 2.5-3B | 4bit quantization | Claude 폴백 로컬 LLM |

### 백엔드 (기여)

| 기술 | 버전 | 용도 |
| --- | --- | --- |
| Spring Boot | 3.3.5 (Java 17) | REST API 서버 |
| Spring Security + JWT | — | 인증·인가 (Access 15분 / Refresh 7일 Rotation) |
| Redis | 7-alpine | 유저 프로파일 Hash, 트렌딩 Sorted Set, 추천 캐시 |
| PostgreSQL | 16 | Gold 레이어 DB (news_items, papers, github_repos) |

### 인프라 (공통)

| 기술 | 버전 | 용도 |
| --- | --- | --- |
| Docker Compose | — | 10개 서비스 통합 운영 |
| Jenkins | — | CI/CD 파이프라인 |

---

## 6. 프로젝트 링크

| 자료 | 링크 |
| --- | --- |
| **GitLab 저장소** | [링크 추가 예정] |
| **기술 문서 (상세)** | [docs/TECH_DOCUMENT.md](./TECH_DOCUMENT.md) |
| **요구사항 명세서 (SRS)** | [docs/SRS.md](./SRS.md) |
| **시스템 아키텍처 다이어그램** | [docs/diagrams/01_system_architecture.md](./diagrams/01_system_architecture.md) |
| **데이터 파이프라인 다이어그램** | [docs/diagrams/02_data_pipeline.md](./diagrams/02_data_pipeline.md) |

---

*이 문서에 기재된 모든 수치와 설계 결정은 실제 코드베이스에서 확인된 내용입니다.*
