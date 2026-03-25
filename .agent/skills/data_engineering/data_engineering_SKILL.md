---
name: data_engineering
description: 데이터 엔지니어링 및 분석 전문 Skill. Spark, Kafka, Airflow, PostgreSQL, 트렌드 스코어링, 가중치 설계 등 데이터 파이프라인 코드 작성 및 분석 업무 시 반드시 참고하세요.
---

# 데이터 엔지니어링 & 분석 Skill

## 기술 스택 기준

| 영역 | 기술 |
|---|---|
| 분산 처리 | Apache Spark (PySpark) |
| 메시지 큐 | Apache Kafka |
| 워크플로우 | Apache Airflow (DAG) |
| 저장소 | PostgreSQL + pgvector, S3/MinIO |
| AI 분석 | FastAPI + LLM (Qwen/Claude) |
| 언어 | Python 3.10+ |

---

## 데이터 레이어 아키텍처 원칙

```
Bronze (원본) → Silver (정제·AI분석) → Gold (집계·서빙)
```

- **Bronze**: 수집된 원본 데이터 그대로 저장, 절대 수정 금지
- **Silver**: AI 분석 적용, 정규화, Null 처리, 스키마 강제
- **Gold**: 집계·랭킹·점수 계산 결과, DB에 Upsert

---

## 스코어 / 가중치 설계 규칙

### 복합 점수 공식 작성 시
- 각 항목의 가중치 합계는 **반드시 1.0 (100%)**
- 0~1 사이로 정규화 후 가중합 적용
- 점수 범위는 명시적으로 주석에 기재

```python
# 예시: trendScore (0~100)
trend_score = (
    paper_score   * 0.35 +   # 논문 언급 수 (0~1 정규화)
    github_score  * 0.35 +   # GitHub 트렌드 (0~1 정규화)
    news_score    * 0.20 +   # 뉴스 언급 수 (0~1 정규화)
    sentiment_score * 0.10   # 감성 점수 (0~1 정규화)
) * 100
```

### 정규화 방식
- **Min-Max**: 범위가 명확한 수치 (스타 수, 커밋 수)
- **Log 스케일**: 분포가 편향된 수치 (뷰 카운트, 언급 수)
- **백분위수**: 상대 순위 기반 비교가 필요한 경우

```python
# Min-Max 정규화
def normalize(value, min_val, max_val):
    if max_val == min_val:
        return 0.0
    return max(0.0, min(1.0, (value - min_val) / (max_val - min_val)))

# Log 스케일 정규화 (0 안전 처리)
import math
def log_normalize(value, max_val):
    if max_val <= 0:
        return 0.0
    return math.log1p(value) / math.log1p(max_val)
```

---

## Airflow DAG 작성 규칙

```python
from airflow import DAG
from airflow.operators.python import PythonOperator
from datetime import datetime, timedelta

default_args = {
    'owner': 'data-team',
    'retries': 2,
    'retry_delay': timedelta(minutes=5),
    'email_on_failure': False,
}

with DAG(
    dag_id='example_pipeline',
    default_args=default_args,
    schedule_interval='0 * * * *',  # 매 시간
    start_date=datetime(2026, 1, 1),
    catchup=False,
    tags=['silver', 'trend'],
) as dag:
    task = PythonOperator(
        task_id='process_data',
        python_callable=process_func,
    )
```

- DAG ID: `snake_case` 사용
- `catchup=False` 기본 적용
- 태스크 간 의존성: `task1 >> task2` 형식

---

## PySpark 코드 규칙

```python
from pyspark.sql import SparkSession
from pyspark.sql import functions as F
from pyspark.sql.types import StructType, StructField, StringType, DoubleType

spark = SparkSession.builder \
    .appName("SilverRefinement") \
    .getOrCreate()

# 항상 스키마를 명시적으로 정의
schema = StructType([
    StructField("article_id", StringType(), False),  # NOT NULL
    StructField("score", DoubleType(), True),
])

# Upsert 패턴 (PostgreSQL)
df.write \
    .format("jdbc") \
    .option("url", jdbc_url) \
    .option("dbtable", "target_table") \
    .option("driver", "org.postgresql.Driver") \
    .mode("append") \
    .save()
```

- `nullable=False` 필드는 반드시 NOT NULL 처리 확인
- `show()` / `printSchema()` 는 개발 시에만, 운영 코드에서 제거
- 파티션이 클 경우 `repartition()` 또는 `coalesce()` 명시

---

## 트렌드 집계 분석 패턴

### 시계열 변화율 계산

```python
from pyspark.sql.window import Window

window_spec = Window.partitionBy("keyword").orderBy("stat_date")

df = df.withColumn(
    "week_over_week",
    (F.col("mention_count") - F.lag("mention_count", 7).over(window_spec))
    / F.lag("mention_count", 7).over(window_spec)
)
```

### 키워드 랭킹

```python
# 최근 N일 기준 집계
from datetime import date, timedelta

cutoff = date.today() - timedelta(days=7)
df_recent = df.filter(F.col("stat_date") >= cutoff)

df_ranked = df_recent \
    .groupBy("keyword") \
    .agg(F.sum("mention_count").alias("total_mentions")) \
    .orderBy(F.desc("total_mentions"))
```

---

## PostgreSQL 쿼리 / Upsert 패턴

```sql
-- Upsert (ON CONFLICT)
INSERT INTO tech_keyword_daily (keyword, stat_date, mention_count)
VALUES (%s, %s, %s)
ON CONFLICT (keyword, stat_date)
DO UPDATE SET
    mention_count = EXCLUDED.mention_count,
    updated_at = NOW();
```

```python
# psycopg2 배치 Upsert
import psycopg2.extras

with conn.cursor() as cur:
    psycopg2.extras.execute_batch(cur, upsert_sql, records, page_size=500)
conn.commit()
```

---

## 데이터 품질 검증 체크리스트

코드 작성 시 반드시 확인:
- [ ] NOT NULL 컬럼에 null 값이 들어오는 경우 처리
- [ ] 날짜 포맷 통일: `YYYY-MM-DD` (date), `YYYY-MM-DDTHH:MM:SS` (datetime)
- [ ] 점수/비율이 0~1 또는 0~100 범위를 벗어나지 않도록 clamp
- [ ] 중복 레코드 방지 (Upsert 또는 distinct)
- [ ] 빈 배열/null 배열 구분하여 처리

---

## 주의사항

- `batch_date`는 `DateType` 사용 (StringType 아님)
- Airflow Variables/Connections은 코드에 하드코딩 금지, 환경변수로 관리
- Spark Job은 로컬 테스트 시 `master("local[*]")`, 운영 시 `master("yarn")` 또는 클러스터 설정
- LLM 분석 결과는 JSON 파싱 실패에 대한 fallback 처리 필수
