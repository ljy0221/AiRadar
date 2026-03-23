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
    dag_id='trend_aggregator_daily',
    schedule_interval='0 2 * * *',  # 매일 새벽 2시 실행
    start_date=datetime(2026, 1, 1),
    catchup=False,
    params={
        'weight_paper': 0.10,
        'weight_github': 0.40,
        'weight_news': 0.40,
        'weight_sentiment': 0.10,
    }
) as dag:
    run_aggregator = SparkSubmitOperator(
        task_id='run_trend_aggregator',
        application='/opt/spark-jobs/airadar-spark.jar',
        java_class='com.mcp.airadar.spark.TrendAggregationJob',
        conn_id='spark_default',
        application_args=[
            '--date', '{{ ds }}',
            '--weight-paper', '{{ params.weight_paper }}',
            '--weight-github', '{{ params.weight_github }}',
            '--weight-news', '{{ params.weight_news }}',
            '--weight-sentiment', '{{ params.weight_sentiment }}'
        ],
        conf=SPARK_CONF,
    )