from datetime import datetime, timedelta

from airflow import DAG
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
    'execution_timeout': timedelta(hours=1),
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

def get_latest_silver_execution_date(execution_date, **kwargs):
    """가장 최근 성공한 silver_refinement run의 execution_date 반환"""
    from airflow.utils.session import create_session
    with create_session() as session:
        last_run = (
            session.query(DagRun)
            .filter(
                DagRun.dag_id == 'silver_refinement',
                DagRun.state == State.SUCCESS,
            )
            .order_by(DagRun.execution_date.desc())
            .first()
        )
    if last_run:
        return last_run.execution_date
    return execution_date


with DAG(
    dag_id='gold_serving',
    default_args=default_args,
    schedule_interval='@hourly',
    start_date=datetime(2025, 1, 1),
    catchup=False,
    max_active_runs=1,    # 동시 실행 1개로 제한 (Spark OOM 방지)
    tags=['gold', 'batch'],
) as dag:

    # Silver refinement DAG의 완료를 대기 (같은 execution_date 기준)
    wait_for_silver = ExternalTaskSensor(
        task_id='wait_for_silver_refinement',
        external_dag_id='silver_refinement',
        external_task_id='refresh_tech_contents_view',  # silver DAG 마지막 task
        execution_date_fn=get_latest_silver_execution_date,
        timeout=3600,           # 최대 1시간 대기
        poke_interval=60,       # 60초마다 확인
        mode='reschedule',      # slot을 점유하지 않고 대기
    )

    run_gold_job = SparkSubmitOperator(
        task_id='run_gold_serving',
        application='/opt/spark-jobs/airadar-spark.jar',
        java_class='com.mcp.airadar.spark.GoldServingJob',
        conn_id='spark_default',
        application_args=['--date', '{{ ds }}'],
        conf=SPARK_CONF,
    )

    wait_for_silver >> run_gold_job
