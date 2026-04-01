# Spark ALS Job 운영 가이드

> **대상 독자**: 데이터 엔지니어, 인프라/DevOps 담당자
> **읽는 데 걸리는 시간**: 약 10분
> **전제 지식**: Apache Spark 기초, Airflow DAG 기초, PostgreSQL 기초

이 문서는 `CollaborativeFilteringJob`의 실행 조건, 운영 방법, 트러블슈팅을 다룹니다.

---

## 역할 요약

`CollaborativeFilteringJob`은 매일 최근 30일치 사용자 행동 로그(`search_logs`)를 분석해 사용자별 맞춤 기사 추천 목록을 `user_recommendations` 테이블에 저장합니다.

```
search_logs (PostgreSQL)
      │ 최근 30일, 로그인 사용자만
      ▼
CollaborativeFilteringJob (Spark ALS)
      │ ALS 모델 학습 + Top-20 추천 생성
      ▼
user_recommendations (PostgreSQL)
      │ expires_at = 생성 + 1일
      ▼
RecommendationService (Spring Boot)
      │ 서빙 시 ALS 결과 + 키워드 매칭 결합
      ▼
GET /api/v1/recommendations/news
```

---

## 실행 조건

### 필수 환경변수

| 환경변수 | 설명 | 예시 |
|----------|------|------|
| `POSTGRES_JDBC_URL` | PostgreSQL JDBC URL | `jdbc:postgresql://172.26.5.50:15432/airadar` |
| `POSTGRES_USER` | DB 사용자명 | `airadar` |
| `POSTGRES_PASSWORD` | DB 비밀번호 | (`.env.server1` 참조) |
| `SPARK_MASTER` | Spark 마스터 주소 | `spark://spark-master:7077` (기본값: `local[*]`) |

### 최소 데이터 조건

Job은 다음 조건 중 하나라도 미충족 시 **자동으로 SKIP**합니다.

| 조건 | 기준값 | 이유 |
|------|--------|------|
| 로그인 사용자 수 | 5명 이상 | ALS는 최소 사용자 수가 있어야 의미 있는 패턴을 학습함 |
| 기사 수 | 10개 이상 | 추천 다양성 확보 |

SKIP 시 로그:
```
[ALS] 데이터 부족 (사용자 3명, 기사 7개) → ALS Job SKIP
```

SKIP은 에러가 아닙니다. 기존 `user_recommendations` 데이터는 그대로 유지됩니다.

---

## ALS 모델 파라미터

| 파라미터 | 값 | 조정 가이드 |
|----------|-----|------------|
| `rank` | 10 | 잠재 요인 수. 높이면 표현력 증가 but 학습 시간 증가, OOM 위험 |
| `maxIter` | 10 | 반복 횟수. 높이면 정확도 증가 but 시간 증가 |
| `regParam` | 0.1 | 정규화 강도. 높이면 과적합 감소, 낮추면 정확도 증가 |
| `implicitPrefs` | `true` | 암묵적 피드백 모드. 변경 금지 |
| `coldStartStrategy` | `"drop"` | 새 사용자/기사는 예측 제외. 변경 금지 |

> **서비스 초기** (사용자 수 적을 때): rank=5, maxIter=5로 낮춰도 됩니다.
> **사용자 수 급증 시** (1만 명+): executor 인스턴스 수를 늘리거나 `spark.executor.memory`를 높이세요.

---

## Airflow DAG

### DAG 정보

| 항목 | 값 |
|------|-----|
| DAG ID | `recommendation_als` |
| 스케줄 | 매일 새벽 3시 (`0 3 * * *`) |
| 태그 | `recommendation`, `als`, `batch` |
| 최대 동시 실행 | 1 (`max_active_runs=1`) |
| 재시도 | 1회 (10분 후) |

### 태스크 체인

```
check_minimum_data
        │
        │  데이터 부족 시 → AirflowSkipException (SKIP, FAIL 아님)
        ▼
run_collaborative_filtering (SparkSubmitOperator)
```

### Spark Job 실행 파라미터

```python
SparkSubmitOperator(
    application='/opt/spark-jobs/airadar-spark.jar',
    java_class='com.mcp.airadar.spark.CollaborativeFilteringJob',
    application_args=['--date', '{{ ds }}'],  # 실행 날짜 (YYYY-MM-DD)
    conf={
        'spark.master': 'spark://spark-master:7077',
        'spark.executor.memory': '1g',
        'spark.executor.cores': '1',
        'spark.executor.instances': '2',
        'spark.driver.memory': '1g',
    },
)
```

---

## 수동 실행

### Airflow UI에서 트리거

1. Airflow 웹 UI 접속 (`http://server1:8081`)
2. DAG 목록에서 `recommendation_als` 선택
3. "Trigger DAG" 버튼 클릭
4. `conf` JSON에 날짜를 지정하거나 기본값 사용

### Airflow CLI로 트리거

```bash
docker exec -it server1-airflow \
  airflow dags trigger recommendation_als
```

특정 날짜 지정:
```bash
docker exec -it server1-airflow \
  airflow dags trigger recommendation_als \
  --conf '{"date": "2026-03-20"}'
```

### Spark Job 직접 실행 (로컬 테스트)

```bash
cd AIRadar/backend
./gradlew runSparkJob -Pjob=CollaborativeFilteringJob -Pdate=2026-03-20
```

> **주의**: 로컬 실행 시 `SPARK_MASTER`가 `local[*]`로 자동 설정됩니다. 환경변수 `POSTGRES_JDBC_URL`, `POSTGRES_USER`, `POSTGRES_PASSWORD`는 별도로 설정해야 합니다.

---

## 추천 결과 만료 정책

`user_recommendations` 테이블의 각 행은 생성 후 **1일** 뒤 `expires_at`이 설정됩니다.

Spring Boot 서빙 레이어는 `expires_at > NOW()` 조건으로 유효한 추천만 사용합니다.

- Job이 매일 실행되므로 정상 운영 시 만료 문제가 없습니다.
- Job이 하루 이상 실패하면 ALS 결과가 소진되고 키워드 매칭 + Cold start로 폴백됩니다.

만료된 행은 자동으로 제거되지 않습니다. 주기적으로 정리하려면:

```sql
-- 만료된 추천 제거 (필요 시 수동 실행 또는 cron 추가)
DELETE FROM user_recommendations WHERE expires_at < NOW() - INTERVAL '7 days';
```

---

## 트러블슈팅

### SKIP이 예상보다 자주 발생하는 경우

Airflow 로그에서 SKIP 메시지를 확인합니다:

```
데이터 부족 (사용자 N명, 기사 M개) → ALS Job SKIP
```

원인과 해결:
1. **이벤트 발송이 안 되고 있음**: 프론트엔드 이벤트 발송 연동 확인
2. **search_logs 파티션 누락**: `search_logs_2026_03` 등 해당 월 파티션이 존재하는지 확인
3. **서비스 초기**: 정상. 사용자가 쌓일 때까지 대기

### OOM (Error Code -9) 발생

```bash
# Airflow 컨테이너 메모리 한도 확인
docker inspect server1-airflow | grep Memory
```

`mem_limit`이 6g 미만이면 증설이 필요합니다. Spark driver(~1.4g) + Airflow(~800MB) + ALS 학습 메모리를 합산하면 최소 6g가 필요합니다.

Spark 파라미터를 낮추는 방법:

```python
# recommendation_dag.py SPARK_CONF 수정
'spark.executor.memory': '512m',  # 1g → 512m
'spark.executor.instances': '1',  # 2 → 1
'spark.driver.memory': '512m',    # 1g → 512m
```

### DB 접속 실패

```
[ALS] DB 접속 실패, ALS Job SKIP: could not connect to server
```

확인 항목:
1. `POSTGRES_JDBC_URL` 환경변수 설정 여부: `docker exec server1-airflow env | grep POSTGRES`
2. PostgreSQL 컨테이너 상태: `docker ps | grep postgres`
3. server1 → server2 네트워크: `ping 172.26.5.50`

### user_recommendations 테이블이 비어있는 경우

```sql
-- 최근 실행 결과 확인
SELECT COUNT(*), MIN(generated_at), MAX(generated_at), MIN(expires_at)
FROM user_recommendations;
```

행이 없다면:
1. Airflow에서 `recommendation_als` DAG 실행 이력 확인
2. SKIP 로그가 있다면 최소 데이터 조건 미충족
3. 에러 로그가 있다면 위 항목 확인

---

## 관련 문서

- [추천 시스템 아키텍처 개요](./01-architecture-overview.md) — ALS가 전체 시스템에서 차지하는 위치
- [이벤트 발송 API 명세](./03-event-api.md) — search_logs 데이터를 쌓는 프론트엔드 연동
