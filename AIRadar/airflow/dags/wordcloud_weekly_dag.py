from airflow import DAG
from airflow.providers.apache.spark.operators.spark_submit import SparkSubmitOperator
from datetime import datetime

SPARK_CONF = {
    'spark.master': 'spark://spark-master:7077',
    'spark.executor.memory': '1g',
    'spark.executor.cores': '1',
    'spark.driver.memory': '1g',
}

with DAG(
    dag_id='wordcloud_weekly',
    schedule_interval='0 3 * * 1',  # 매주 월요일 새벽 3시 실행
    start_date=datetime(2026, 1, 5), # 월요일
    catchup=False,
) as dag:
    run_aggregator = SparkSubmitOperator(
        task_id='run_wordcloud_aggregator',
        application='/opt/spark-jobs/airadar-spark.jar',
        java_class='com.mcp.airadar.spark.WordCloudAggregationJob',
        conn_id='spark_default',
        application_args=[
            '--week-start', '{{ ds }}', # ds는 실행일 기준(월요일)의 현재 주기 시작일(전주 월요일)
        ],
        conf=SPARK_CONF,
    )
