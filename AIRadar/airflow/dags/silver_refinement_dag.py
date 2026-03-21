from datetime import datetime, timedelta

from airflow import DAG
from airflow.operators.bash import BashOperator
from airflow.providers.apache.spark.operators.spark_submit import SparkSubmitOperator
from airflow.sensors.external_task import ExternalTaskSensor
from airflow.models import DagRun
from airflow.utils.state import State

default_args = {
    'owner': 'ai-radar',
    'retries': 2,
    'retry_delay': timedelta(minutes=5),
    'email_on_failure': False,
    'depends_on_past': False,
    'execution_timeout': timedelta(hours=12),  # 로컬 AI 서버 기준 충분한 여유
}

SPARK_CONF = {
    'spark.master': 'spark://spark-master:7077',
    'spark.executor.memory': '1g',
    'spark.executor.cores': '1',
    'spark.executor.instances': '2',   # OOM 방지 (15g 서버 기준 2개 제한)
    'spark.driver.memory': '1g',
    'spark.sql.extensions': 'io.delta.sql.DeltaSparkSessionExtension',
    'spark.sql.catalog.spark_catalog': 'org.apache.spark.sql.delta.catalog.DeltaCatalog',
}

with DAG(
    dag_id='silver_refinement',
    default_args=default_args,
    schedule_interval=None,  # 수동 트리거만 (로컬 AI 서버 처리 시간 고려)
    start_date=datetime(2025, 1, 1),
    catchup=False,
    max_active_runs=1,    # 동시 실행 1개로 제한 (Spark OOM 방지)
    tags=['silver', 'batch'],
    params={
        # 한 번 실행당 처리할 최대 건수. 0 또는 미지정 시 전체 처리.
        'limit': 200,
    },
) as dag:

    def get_latest_bronze_execution_date(execution_date, **kwargs):
        """가장 최근 성공한 bronze_kafka_ingestion run의 execution_date 반환"""
        from airflow.utils.session import create_session
        with create_session() as session:
            last_run = (
                session.query(DagRun)
                .filter(
                    DagRun.dag_id == 'bronze_kafka_ingestion',
                    DagRun.state == State.SUCCESS,
                )
                .order_by(DagRun.execution_date.desc())
                .first()
            )
        if last_run:
            return last_run.execution_date
        return execution_date

    # Bronze 적재 완료 후 Silver 정제 실행
    wait_for_bronze = ExternalTaskSensor(
        task_id='wait_for_bronze_ingestion',
        external_dag_id='bronze_kafka_ingestion',
        external_task_id=None,   # DAG 전체 완료 대기
        execution_date_fn=get_latest_bronze_execution_date,
        timeout=3600,
        poke_interval=60,
        mode='reschedule',       # slot을 점유하지 않고 대기
    )

    # news → paper → github 순차 실행 (Spark driver 동시 실행 시 OOM 방지)
    refine_news = SparkSubmitOperator(
        task_id='refine_news',
        application='/opt/spark-jobs/airadar-spark.jar',
        java_class='com.mcp.airadar.spark.SilverRefinementJob',
        conn_id='spark_default',
        application_args=[
            '--date', '{{ ds }}',
            '--source-type', 'news',
            '--limit', '{{ params.limit }}',
        ],
        conf=SPARK_CONF,
    )

    refine_paper = SparkSubmitOperator(
        task_id='refine_paper',
        application='/opt/spark-jobs/airadar-spark.jar',
        java_class='com.mcp.airadar.spark.SilverRefinementJob',
        conn_id='spark_default',
        application_args=[
            '--date', '{{ ds }}',
            '--source-type', 'paper',
            '--limit', '{{ params.limit }}',
        ],
        conf=SPARK_CONF,
    )

    refine_github = SparkSubmitOperator(
        task_id='refine_github',
        application='/opt/spark-jobs/airadar-spark.jar',
        java_class='com.mcp.airadar.spark.SilverRefinementJob',
        conn_id='spark_default',
        application_args=[
            '--date', '{{ ds }}',
            '--source-type', 'github',
            '--limit', '{{ params.limit }}',
        ],
        conf=SPARK_CONF,
    )

    # Silver 처리 완료 후 Materialized View REFRESH
    # CONCURRENTLY: 조회를 막지 않고 갱신 (unique index 필요)
    refresh_view = BashOperator(
        task_id='refresh_tech_contents_view',
        bash_command=(
            'PGPASSWORD="$POSTGRES_PASSWORD" psql '
            '-h "$POSTGRES_HOST" -p "$POSTGRES_PORT" '
            '-U "$POSTGRES_USER" -d "$POSTGRES_DB" '
            '-c "REFRESH MATERIALIZED VIEW CONCURRENTLY public.tech_contents_view;"'
        ),
        execution_timeout=timedelta(minutes=10),
    )

    wait_for_bronze >> refine_news >> refine_paper >> refine_github >> refresh_view
