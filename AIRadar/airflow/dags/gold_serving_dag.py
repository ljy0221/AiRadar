from datetime import datetime, timedelta

from airflow import DAG
from airflow.providers.apache.spark.operators.spark_submit import SparkSubmitOperator
from airflow.sensors.external_task import ExternalTaskSensor

default_args = {
    'owner': 'ai-radar',
    'retries': 2,
    'retry_delay': timedelta(minutes=5),
    'email_on_failure': False,
    'depends_on_past': False,
    'execution_timeout': timedelta(hours=1),
}

SPARK_CONF = {
    'spark.executor.memory': '2g',
    'spark.executor.cores': '2',
    'spark.executor.instances': '4',   # Worker 2대 × executor 2개
    'spark.driver.memory': '1g',
    'spark.sql.extensions': 'io.delta.sql.DeltaSparkSessionExtension',
    'spark.sql.catalog.spark_catalog': 'org.apache.spark.sql.delta.catalog.DeltaCatalog',
}

with DAG(
    dag_id='gold_serving',
    default_args=default_args,
    schedule_interval='@hourly',
    start_date=datetime(2025, 1, 1),
    catchup=False,
    tags=['gold', 'batch'],
) as dag:

    # Silver refinement DAG의 완료를 대기 (같은 execution_date 기준)
    wait_for_silver = ExternalTaskSensor(
        task_id='wait_for_silver_refinement',
        external_dag_id='silver_refinement',
        external_task_id='refresh_tech_contents_view',  # silver DAG 마지막 task
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
