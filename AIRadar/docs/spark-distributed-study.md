# Spark 분산 처리 확장 — 구현 이유와 개념 정리

> 이 문서는 Spark Worker 2대 분산, HttpClient 최적화, PostgreSQL 튜닝 작업의
> **왜(Why) → 원인(Cause) → 해결(How) → 코드 위치(Where)** 를 설명합니다.
> 팀원이 이 구조를 이해하고 직접 튜닝할 수 있도록 작성했습니다.

---

## 1. Spark Standalone 클러스터 구조

### 왜 알아야 하나

Worker를 Server2에 추가하려면 Master / Worker / Driver / Executor 역할이 무엇인지 알아야 한다.

### 4가지 역할 구분

```
┌─────────────────────────────────────────────────────┐
│ Airflow (Driver 역할)                                │
│   SparkSubmitOperator → Job 제출                    │
└──────────────────────┬──────────────────────────────┘
                       │ spark-submit
                       ▼
┌─────────────────────────────────────────────────────┐
│ Spark Master  (spark-master:7077)                   │
│   - Worker 목록 관리                                 │
│   - Executor 할당 결정                               │
└────────────┬────────────────────┬───────────────────┘
             │                    │
             ▼                    ▼
┌────────────────────┐  ┌────────────────────┐
│ spark-worker1      │  │ spark-worker2      │
│ Server1 (2코어/4g) │  │ Server2 (2코어/4g) │
│                    │  │                    │
│ [Executor1][Exec2] │  │ [Executor3][Exec4] │
│  ↑ Task실행        │  │  ↑ Task실행         │
└────────────────────┘  └────────────────────┘
```

| 역할 | 설명 | 이번 구성 |
|------|------|-----------|
| **Master** | Worker 목록 관리, Executor 배치 결정 | Server1의 `spark-master` 컨테이너 |
| **Worker** | Executor를 실제로 실행하는 프로세스 | Server1 `spark-worker` + Server2 `spark-worker2` |
| **Driver** | 사용자 Job 로직을 실행, Task DAG 생성 | Airflow 컨테이너 내 `spark-submit` 프로세스 |
| **Executor** | 실제 데이터 처리 JVM 프로세스 | Worker당 2개 → 총 4개 |

### Worker 등록 방식

Worker 컨테이너가 시작될 때 `spark-class Worker spark://spark-master:7077` 명령으로
Master에 자신을 등록한다. Server2의 Worker2도 동일하게 `SERVER1_PRIVATE_HOST:7077`로 등록한다.

```yaml
# docker-compose.server2.yml:185-187
command: >
  /opt/spark/bin/spark-class org.apache.spark.deploy.worker.Worker
  spark://${SERVER1_PRIVATE_HOST:-localhost}:7077
```

**핵심**: Master는 등록된 모든 Worker의 가용 자원을 알고 있다.
`spark.executor.instances=4`를 설정하면 Master가 4개 Executor를 2대 Worker에 분산 배치한다.

---

## 2. Medallion Architecture — Bronze / Silver / Gold 분리 이유

### 왜 알아야 하나

Silver/Gold Job이 왜 2개로 나뉘는지, 왜 Bronze 데이터를 절대 수정하지 않는지 이해해야
장애 발생 시 올바른 재처리를 할 수 있다.

### 레이어별 역할과 불변성

```
Kafka → [Bronze] → SilverRefinementJob → [Silver] → GoldServingJob → [Gold/PostgreSQL]
          원본        AI 분석 + 정제          정제본       JDBC Upsert       서비스 DB
          불변        오류 시 skip            재처리 가능    멱등성 보장
```

| 레이어 | 저장소 | 특성 | 오류 처리 |
|--------|--------|------|-----------|
| **Bronze** | Delta Lake (MinIO) | Immutable — 절대 수정 불가 | 없음 (원본 보존) |
| **Silver** | Delta Lake (MinIO) | AI 분석 결과 반영 | `error_log` 컬럼에 기록 후 skip |
| **Gold** | PostgreSQL | 서비스 응답용 | staging 패턴으로 원자성 보장 |

### 왜 Bronze를 건드리지 않는가

Bronze를 수정하면 원본을 잃는다. AI 서버가 버그가 있었거나, 스키마가 바뀌었을 때
Bronze만 있으면 Silver부터 언제든 재처리 가능하다.

```
재처리 시나리오:
  1. AI 서버 모델 업그레이드
  2. Silver 파티션 삭제 (해당 날짜)
  3. SilverRefinementJob 재실행 → Bronze에서 다시 읽어 Silver 재생성
  4. GoldServingJob 재실행 → ON CONFLICT DO UPDATE로 덮어쓰기
```

### Silver에서 오류 처리 방식

AI 서버 호출 실패 시 파이프라인을 중단하지 않고 `error_log` 컬럼에 오류 메시지를 기록한다.
Gold 서빙 Job은 `error_log IS NULL` 조건으로 정상 레코드만 읽는다.

```java
// SilverRefinementJob.java:237-242
} catch (Exception e) {
    System.err.println("[Silver] 배치 분석 실패: " + e.getMessage());
    for (Row row : batch) {
        result.add(buildErrorRow(row, sourceType, batchDate, e.getMessage()));
    }
}
```

---

## 3. `repartition()` + `mapPartitions()` — 병렬 처리의 핵심

### 왜 알아야 하나

`AI_SERVER_CONCURRENCY` 환경변수가 어떻게 동시 처리 수에 영향을 주는지 이해해야
AI 서버 부하를 조절할 수 있다.

### `repartition(n)` — 데이터를 n조각으로 나누기

```
Bronze 데이터 (예: 1,000건)
        ↓ repartition(20)
파티션0 [50건] 파티션1 [50건] ... 파티션19 [50건]
        ↓ 각 파티션이 Task 1개가 됨
Task0  Task1  Task2  ...  Task19  (총 20개 Task)
        ↓ 4 Executor가 순서대로 처리
Exec1: Task0, Task4, Task8,  Task12, Task16
Exec2: Task1, Task5, Task9,  Task13, Task17
Exec3: Task2, Task6, Task10, Task14, Task18
Exec4: Task3, Task7, Task11, Task15, Task19
```

```java
// SilverRefinementJob.java:174-177
int aiConcurrency = Integer.parseInt(
    System.getenv().getOrDefault("AI_SERVER_CONCURRENCY", "10")
);
Dataset<Row> repartitioned = bronze.repartition(aiConcurrency);
```

### `mapPartitions()` — 파티션 단위 함수 실행

`map()`은 Row 1개마다 함수를 호출하지만,
`mapPartitions()`는 파티션(Row 묶음) 단위로 Iterator를 받아 한 번에 처리한다.

**우리 코드에서의 역할**: 파티션 내 Row를 `AI_BATCH_SIZE`개씩 묶어 AI 서버에 배치 호출.

```
파티션0 (50건)
  → 배치0 [10건] → POST /analyze/news/batch  ← HTTP 호출 1회
  → 배치1 [10건] → POST /analyze/news/batch  ← HTTP 호출 1회
  → 배치2 [10건] → POST /analyze/news/batch  ← HTTP 호출 1회
  → 배치3 [10건] → POST /analyze/news/batch  ← HTTP 호출 1회
  → 배치4 [10건] → POST /analyze/news/batch  ← HTTP 호출 1회
```

---

## 4. HttpClient 재사용 — TCP 연결 비용

### 왜 알아야 하나

분산 환경에서 네트워크 비용은 생각보다 크다.
이번 최적화가 실질적으로 가장 임팩트 있는 변경이다.

### TCP 연결 수립 비용

HTTP 요청을 보내려면 먼저 TCP 연결(3-way handshake)이 필요하다.

```
Client                    Server
  │── SYN ──────────────▶ │
  │◀─ SYN-ACK ─────────── │    ← 약 1 RTT (수 ms ~ 수십 ms)
  │── ACK ──────────────▶ │
  │── HTTP Request ──────▶ │
  │◀─ HTTP Response ────── │
  │── FIN ──────────────▶ │   ← 연결 종료
```

### 기존 코드의 문제

`postJson()` 내부에서 매 호출마다 `CloseableHttpClient`를 생성하고 `try-with-resources`로 닫았다.
파티션 20개 × 배치 5회 = **100번의 TCP 연결 수립/종료** 발생.

```java
// 변경 전 — 매 배치마다 TCP 연결 생성/종료
private static JsonNode postJson(String path, Object body) throws Exception {
    try (CloseableHttpClient client = HttpClients.custom()...build()) {
        //  ↑ 이 try 블록이 끝날 때마다 TCP 연결 FIN
        HttpPost post = new HttpPost(AI_SERVER_URL + path);
        return client.execute(post, response -> ...);
    } // ← 여기서 소켓 닫힘
}
```

### 변경 후 — 파티션당 1회 연결

`mapPartitions` 클로저에서 HttpClient를 1회 생성하고 파티션 내 모든 배치가 재사용한다.
HTTP 1.1 Keep-Alive가 기본 활성화되어 있어 동일 소켓으로 여러 요청을 보낸다.

```java
// SilverRefinementJob.java:227-245
try (CloseableHttpClient client = buildHttpClient()) {
    // 이 client가 파티션 내 모든 배치에서 재사용됨
    for (int i = 0; i < buffer.size(); i += AI_BATCH_SIZE) {
        List<Row> batch = buffer.subList(i, Math.min(i + AI_BATCH_SIZE, buffer.size()));
        List<Row> analyzed = switch (sourceType) {
            case "news"  -> callAnalyzeNewsBatch(client, batch, batchDate);
            case "paper" -> callAnalyzePaperBatch(client, batch, batchDate);
            ...
        };
    }
} // ← 파티션 처리 완료 후에만 소켓 닫힘
```

**효과**: 파티션 20개 × 1회 = 20번의 TCP 연결 (기존 100번 → 80% 감소)

---

## 5. Spark Executor 설정 3종 세트

### 왜 알아야 하나

Airflow DAG에 추가한 3가지 설정값의 의미를 알아야 Worker가 늘어날 때 올바르게 조정할 수 있다.

### 설정값 의미

```python
# silver_refinement_dag.py / gold_serving_dag.py
SPARK_CONF = {
    'spark.executor.memory': '2g',      # Executor JVM 힙 크기
    'spark.executor.cores': '2',        # Executor당 동시 Task 수
    'spark.executor.instances': '4',    # 총 Executor 수 ← 새로 추가
    'spark.driver.memory': '1g',        # Driver JVM 힙 크기 ← 새로 추가
}
```

| 설정 | 의미 | 이번 값 |
|------|------|---------|
| `executor.memory` | Executor JVM이 쓸 수 있는 최대 메모리 | 2GB |
| `executor.cores` | Executor 1개가 동시에 처리할 수 있는 Task 수 | 2개 |
| `executor.instances` | 전체 Job에서 띄울 Executor 총 개수 | 4개 (Worker 2대 × 2) |
| `driver.memory` | Driver(Airflow spark-submit 프로세스) 힙 크기 | 1GB |

### 왜 `executor.instances`를 명시해야 하나

Standalone 모드에서 이 값을 생략하면 Spark가 Worker의 모든 자원을 사용하려 한다.
Worker당 2코어/4GB인데 `instances=4`를 설정하면:

```
총 자원 사용량:
  4 executor × 2코어 = 8코어
  4 executor × 2GB   = 8GB
  Worker1에 2 executor, Worker2에 2 executor 분산 배치
```

### Worker를 3대로 늘리려면?

```python
'spark.executor.instances': '6',   # Worker 3대 × 2개
```

docker-compose를 사용하는 서버에 `spark-worker3` 서비스를 추가하고,
`SERVER1_PRIVATE_HOST:7077`에 등록하면 Master가 자동으로 인식한다.

---

## 6. Docker 멀티 서버 네트워크 — 컨테이너명 DNS의 한계

### 왜 알아야 하나

Worker2가 Server2에 있는데 왜 `http://minio:9000`으로 MinIO에 접근할 수 없는지 이해해야
환경변수를 올바르게 설정할 수 있다.

### 단일 서버 vs 멀티 서버 네트워크

**단일 서버 (docker-compose.yml)**:
```
server1_default (Docker 브리지 네트워크)
├── spark-master  → DNS: "spark-master"
├── spark-worker  → DNS: "spark-worker"
├── minio         → DNS: "minio"        ← 컨테이너명으로 직접 접근 가능
└── kafka         → DNS: "kafka"
```

**멀티 서버**:
```
Server1: server1_default 네트워크          Server2: server2_default 네트워크
├── spark-master                           ├── spark-worker2
├── minio     ← "minio" DNS 유효           ├── ai-server  ← "ai-server" DNS 유효
└── kafka                                  └── postgres   ← "postgres" DNS 유효
```

두 네트워크는 물리적으로 분리되어 있다. Server2의 컨테이너에서 `minio`는 DNS 해석 불가.

### 해결: 사설 IP + 호스트 포트

```yaml
# docker-compose.server2.yml:172
# Worker2가 Server1의 MinIO에 접근할 때
MINIO_ENDPOINT: http://${SERVER1_PRIVATE_HOST:-localhost}:9000
#                                ↑ 서버 사설 IP (컨테이너명 아님)
```

반면 같은 Server2 내 AI Server는 컨테이너명 사용 가능:
```yaml
# docker-compose.server2.yml:177
AI_SERVER_URL: http://ai-server:8000
#                     ↑ 같은 docker network이므로 DNS 해석 가능
```

### 방화벽 오픈 필요 포트 요약

| 방향 | 포트 | 이유 |
|------|------|------|
| Server2 → Server1:7077 | 7077 | Worker2가 Spark Master에 등록 |
| Server2 → Server1:9000 | 9000 | Worker2가 MinIO(Delta Lake) 접근 |
| Server1 → Server2:8000 | 8000 | Worker1이 AI Server 호출 |
| Server1 → Server2:5432 | 5432 | Worker1이 PostgreSQL JDBC 연결 |

---

## 7. GoldServingJob Staging 패턴 — 원자성 보장

### 왜 알아야 하나

`numPartitions`를 8로 올린 이유와 Staging 테이블이 왜 필요한지 이해해야 한다.

### 문제: Spark JDBC는 파티션별 독립 트랜잭션

Spark가 DataFrame을 JDBC로 쓸 때 각 파티션이 **독립적인 트랜잭션**으로 INSERT한다.
파티션이 8개면 8개의 트랜잭션이 병렬로 실행된다.

```
파티션0 → INSERT 500건 → COMMIT  ✓
파티션1 → INSERT 500건 → COMMIT  ✓
파티션2 → INSERT 500건 → COMMIT  ✓
파티션3 → INSERT 500건 → ROLLBACK  ✗  ← 이미 3개 파티션은 커밋됨
```

이렇게 되면 일부만 들어간 불완전한 상태가 된다.

### 해결: Staging 테이블 + 단일 트랜잭션 Upsert

```
Step 1: Spark → news_items_staging (8파티션 병렬 INSERT, 각 독립 트랜잭션)
         ← 실패해도 Staging만 오염, 실제 서비스 테이블 영향 없음

Step 2: 단일 JDBC 연결, 단일 트랜잭션으로 Upsert 실행
         BEGIN;
           INSERT INTO news_items SELECT * FROM news_items_staging
           ON CONFLICT (article_id) DO UPDATE SET ...;
         COMMIT;
         ← 전부 성공 또는 전부 롤백
```

```java
// GoldServingJob.java:252-265 — Step 1: Staging에 병렬로 쓰기
df.write()
    .option("numPartitions", 8)     // 8개 병렬 JDBC 연결
    .option("batchsize", 1000)      // 1000건씩 배치 INSERT
    .mode(SaveMode.Overwrite)       // 매번 Staging 전체 교체
    .save();

// GoldServingJob.java:272-291 — Step 2: 단일 트랜잭션 Upsert
conn.setAutoCommit(false);
stmt.executeUpdate(upsertSql);  // ON CONFLICT DO UPDATE
conn.commit();
```

### `ON CONFLICT DO UPDATE` — 멱등성 보장

같은 날짜로 GoldServingJob을 재실행해도 결과가 동일하다.
`article_id`가 이미 있으면 UPDATE, 없으면 INSERT.

```sql
INSERT INTO news_items (article_id, title, score, ...)
SELECT article_id, title, score, ... FROM news_items_staging
ON CONFLICT (article_id)
DO UPDATE SET
    score = EXCLUDED.score,
    analyzed_at = EXCLUDED.analyzed_at,
    updated_at = NOW();
```

---

## 8. PostgreSQL 메모리 튜닝 — 샤딩 전에 먼저 할 것

### 왜 알아야 하나

"서버가 2개니까 DB도 분산(샤딩)해야 하지 않을까?" 라는 질문에 대한 답.
**샤딩보다 메모리 튜닝이 훨씬 효과적이며 비용도 낮다.**

### 기본값이 왜 부족한가

PostgreSQL 기본 설정은 **매우 보수적**이다. 1990년대 서버 환경을 가정한 값이 많다.

| 파라미터 | 기본값 | 변경값 | 역할 |
|----------|--------|--------|------|
| `shared_buffers` | 128MB | **512MB** | 데이터/인덱스 공유 캐시. OS 메모리의 25% 권장 |
| `work_mem` | 4MB | **16MB** | 정렬·해시조인 세션별 메모리. 복잡한 쿼리에 영향 |
| `maintenance_work_mem` | 64MB | **256MB** | VACUUM, CREATE INDEX에 사용 |
| `max_connections` | 100 | **200** | Spark 8파티션 + Spring Boot 커넥션풀 + Airflow 여유분 |
| `effective_cache_size` | 4GB | **1536MB** | OS 파일 캐시 추정값 (쿼리 플래너 힌트용) |

### `shared_buffers` 가 중요한 이유

PostgreSQL이 데이터를 읽을 때 순서:
1. `shared_buffers` 확인 (메모리, 빠름)
2. OS 파일 캐시 확인 (메모리, 빠름)
3. 디스크에서 읽기 (느림, 수십 ms)

`shared_buffers`가 128MB이면 인덱스(수 GB)가 캐시에 들어가지 않아 매번 디스크 I/O 발생.
512MB로 늘리면 자주 사용되는 인덱스가 메모리에 상주한다.

```yaml
# docker-compose.server2.yml:8-14
command: >
  postgres
  -c shared_buffers=512MB
  -c work_mem=16MB
  -c maintenance_work_mem=256MB
  -c max_connections=200
  -c effective_cache_size=1536MB
```

### DB 샤딩 판단 기준

| 단계 | 규모 | 대응 |
|------|------|------|
| **현재** | ~5~7 GB / 연 | 단일 인스턴스 + 메모리 튜닝 ✓ |
| Tier 2 | ~50 GB / 연간 10M행 | Read Replica 추가 (읽기 분산) |
| Tier 3 | ~500 GB / 연간 100M행 | 날짜 기반 파티셔닝 |
| Tier 4 | ~5 TB / 연간 1B행 | 샤딩 검토 |

**샤딩의 단점**: 테이블 간 JOIN 불가, 분산 트랜잭션 복잡도 증가, 운영 부담 급증.
단순히 서버가 2대라고 DB를 나누는 것은 문제를 만드는 것이다.

---

## 검증 질문

이 문서를 읽은 후 다음에 답할 수 있으면 충분히 이해한 것입니다.

1. **Worker를 3대로 늘리려면 어떤 파일을 어떻게 바꿔야 하나?**
   - 새 서버의 docker-compose에 `spark-worker3` 서비스 추가
   - `spark://SERVER1_PRIVATE_HOST:7077`로 등록 명령 작성
   - Airflow DAG의 `spark.executor.instances`를 `6`으로 변경

2. **`AI_SERVER_CONCURRENCY` 값을 올리면 어떤 효과가 있나?**
   - `repartition(n)` 파티션 수가 늘어남 → 더 많은 Task 생성
   - 4 executor가 더 많은 파티션을 처리 → AI 서버 병렬 요청 증가
   - 단, AI 서버 처리 용량(FastAPI 동시성)을 초과하면 오히려 타임아웃 발생

3. **Silver Job이 실패했을 때 Gold는 어떻게 되나?**
   - 배치 단위 실패: 해당 배치 Row들은 `error_log`에 기록된 Silver 레코드로 저장
   - GoldServingJob은 `error_log IS NULL` 조건으로 정상 레코드만 읽음
   - 이전 Gold 데이터는 그대로 유지 (이번 배치 실패분만 누락)
   - 재처리: Silver 해당 파티션 삭제 후 SilverRefinementJob 재실행 → GoldServingJob 재실행
