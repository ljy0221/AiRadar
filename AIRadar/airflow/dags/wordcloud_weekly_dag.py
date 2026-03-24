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
            '--week-start', '{{ data_interval_end.subtract(days=7).strftime("%Y-%m-%d") }}', # 실행 시점 기준 7일 전을 시작일로 하여 최근 1주일치 집계
        ],
        conf=SPARK_CONF,
    )
