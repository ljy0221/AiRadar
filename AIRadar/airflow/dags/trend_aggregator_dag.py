from airflow import DAG
from airflow.operators.bash import BashOperator
from datetime import datetime, timedelta

with DAG(
    dag_id='trend_aggregator_daily',
    schedule_interval='0 2 * * *',  # 매일 새벽 2시 실행
    start_date=datetime(2026, 1, 1),
    catchup=False,
) as dag:
    run_aggregator = BashOperator(
        task_id='run_trend_aggregator',
        bash_command='python /opt/airflow/scripts/trend_aggregator.py',
    )