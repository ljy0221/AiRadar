from datetime import datetime, timedelta

from airflow import DAG
from airflow.providers.apache.spark.operators.spark_submit import SparkSubmitOperator
from airflow.utils.task_group import TaskGroup

default_args = {
    'owner': 'ai-radar',
    'retries': 2,
    'retry_delay': timedelta(minutes=5),
    'email_on_failure': False,
    'depends_on_past': False,
    'execution_timeout': timedelta(hours=2),
}

SPARK_CONF = {
    'spark.executor.memory': '2g',
    'spark.executor.cores': '2',
    'spark.sql.extensions': 'io.delta.sql.DeltaSparkSessionExtension',
    'spark.sql.catalog.spark_catalog': 'org.apache.spark.sql.delta.catalog.DeltaCatalog',
}

# Kafka 준비 완료 시 SPARK_CONF_KAFKA로 교체
SPARK_CONF_KAFKA = {
    **SPARK_CONF,
    'spark.streaming.stopGracefullyOnShutdown': 'true',
}

# ── [현재] Phase 1 ─────────────────────────────────────────────────────────────
# Crawling Server → Spark → Bronze Delta Lake (HTTP 직접 호출)
# Kafka가 준비되면 아래 Phase 2 DAG로 교체한다
# ──────────────────────────────────────────────────────────────────────────────
with DAG(
    dag_id='bronze_ingestion',
    default_args=default_args,
    schedule_interval='@hourly',
    start_date=datetime(2025, 1, 1),
    catchup=False,
    is_paused_upon_creation=True,   # Phase 2(Kafka) 전환으로 비활성화
    tags=['bronze', 'batch'],
) as dag:

    # news / github 를 TaskGroup으로 병렬 실행
    # 장애 격리: 하나 실패해도 나머지는 계속 실행
    with TaskGroup('bronze_ingestion_tasks') as ingestion_group:
        for source in ['news', 'github']:
            SparkSubmitOperator(
                task_id=f'ingest_{source}',
                application='/opt/spark-jobs/airadar-spark.jar',
                java_class='com.mcp.airadar.spark.BronzeIngestionJob',
                conn_id='spark_default',
                application_args=['--date', '{{ ds }}', '--source-type', source],
                conf=SPARK_CONF,
            )


# ── [예정] Phase 2 ─────────────────────────────────────────────────────────────
# Kafka 준비 완료 후 아래 DAG를 활성화한다.
# 1. 이 파일에서 bronze_ingestion DAG를 비활성화(is_paused_upon_creation=True)
# 2. bronze_kafka_ingestion DAG를 활성화
# 3. silver_refinement_dag.py의 external_dag_id를 'bronze_kafka_ingestion'으로 변경
# ──────────────────────────────────────────────────────────────────────────────
with DAG(
    dag_id='bronze_kafka_ingestion',
    default_args=default_args,
    schedule_interval='@hourly',
    start_date=datetime(2025, 1, 1),
    catchup=False,
    is_paused_upon_creation=False,  # Phase 2 활성화
    tags=['bronze', 'kafka', 'streaming'],
) as kafka_dag:

    # Trigger.AvailableNow() 사용 — 현재 Kafka 메시지 모두 처리 후 종료
    # 체크포인트가 오프셋을 관리하므로 재실행 시 중복 처리 없음
    with TaskGroup('bronze_kafka_tasks') as kafka_group:
        for source in ['news', 'github', 'paper']:
            SparkSubmitOperator(
                task_id=f'consume_{source}',
                application='/opt/spark-jobs/airadar-spark.jar',
                java_class='com.mcp.airadar.spark.KafkaBronzeConsumerJob',
                conn_id='spark_default',
                application_args=['--source-type', source],
                conf=SPARK_CONF_KAFKA,
            )
