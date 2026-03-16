from datetime import datetime, timedelta

from airflow import DAG
from airflow.operators.bash import BashOperator
from airflow.providers.apache.spark.operators.spark_submit import SparkSubmitOperator
from airflow.sensors.external_task import ExternalTaskSensor
from airflow.utils.task_group import TaskGroup
from airflow.utils.session import provide_session
from airflow.models import DagRun
from airflow.utils.state import State

default_args = {
    'owner': 'ai-radar',
    'retries': 2,
    'retry_delay': timedelta(minutes=5),
    'email_on_failure': False,
    'depends_on_past': False,
    'execution_timeout': timedelta(hours=2),  # 좀비 프로세스 방지
}

SPARK_CONF = {
    'spark.master': 'spark://spark-master:7077',
    'spark.executor.memory': '2g',
    'spark.executor.cores': '2',
    'spark.executor.instances': '4',   # Worker 2대 × executor 2개
    'spark.driver.memory': '1g',
    'spark.sql.extensions': 'io.delta.sql.DeltaSparkSessionExtension',
    'spark.sql.catalog.spark_catalog': 'org.apache.spark.sql.delta.catalog.DeltaCatalog',
}

with DAG(
    dag_id='silver_refinement',
    default_args=default_args,
    schedule_interval='@hourly',
    start_date=datetime(2025, 1, 1),
    catchup=False,
    tags=['silver', 'batch'],
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

    # news / paper / github 를 TaskGroup으로 병렬 실행
    # 장애 격리: 하나 실패해도 나머지는 계속 실행
    with TaskGroup('silver_refinement_tasks') as refinement_group:
        for source in ['news', 'paper', 'github']:
            SparkSubmitOperator(
                task_id=f'refine_{source}',
                application='/opt/spark-jobs/airadar-spark.jar',
                java_class='com.mcp.airadar.spark.SilverRefinementJob',
                conn_id='spark_default',
                application_args=['--date', '{{ ds }}', '--source-type', source],
                conf=SPARK_CONF,
            )

    # Silver 처리 완료 후 Materialized View REFRESH
    # CONCURRENTLY: 조회를 막지 않고 갱신 (unique index 필요)
    refresh_view = BashOperator(
        task_id='refresh_tech_contents_view',
        bash_command=(
            'psql "$POSTGRES_URL" -c '
            '"REFRESH MATERIALIZED VIEW CONCURRENTLY tech_contents_view;"'
        ),
        execution_timeout=timedelta(minutes=10),
    )

    wait_for_bronze >> refinement_group >> refresh_view
