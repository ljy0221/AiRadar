from datetime import datetime, timedelta

from airflow import DAG
from airflow.operators.bash import BashOperator
from airflow.providers.apache.spark.operators.spark_submit import SparkSubmitOperator
from airflow.utils.task_group import TaskGroup

default_args = {
    'owner': 'ai-radar',
    'retries': 2,
    'retry_delay': timedelta(minutes=5),
    'email_on_failure': False,
    'depends_on_past': False,
    'execution_timeout': timedelta(hours=2),  # 좀비 프로세스 방지
}

SPARK_CONF = {
    'spark.executor.memory': '2g',
    'spark.executor.cores': '2',
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

    refinement_group >> refresh_view
