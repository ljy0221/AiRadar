from datetime import datetime, timedelta

from airflow import DAG
from airflow.providers.apache.spark.operators.spark_submit import SparkSubmitOperator

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
    dag_id='gold_serving',
    default_args=default_args,
    schedule_interval=None,  # 수동 트리거만
    start_date=datetime(2025, 1, 1),
    catchup=False,
    max_active_runs=1,
    tags=['gold', 'batch'],
) as dag:

    run_gold_job = SparkSubmitOperator(
        task_id='run_gold_serving',
        application='/opt/spark-jobs/airadar-spark.jar',
        java_class='com.mcp.airadar.spark.GoldServingJob',
        conn_id='spark_default',
        application_args=['--date', '{{ ds }}'],
        conf=SPARK_CONF,
    )
