from datetime import datetime, timedelta

from airflow import DAG
from airflow.operators.python import PythonOperator
from airflow.providers.apache.spark.operators.spark_submit import SparkSubmitOperator

default_args = {
    'owner': 'ai-radar',
    'retries': 1,
    'retry_delay': timedelta(minutes=10),
    'email_on_failure': False,
    'depends_on_past': False,
    'execution_timeout': timedelta(hours=2),
}

SPARK_CONF = {
    'spark.master': 'spark://spark-master:7077',
    'spark.executor.memory': '1g',
    'spark.executor.cores': '1',
    'spark.executor.instances': '2',
    'spark.driver.memory': '1g',
}


def check_minimum_data(**context):
    """
    ALS Job 실행 전 search_logs 데이터 최소 조건 확인.
    사용자 5명 미만 / 기사 10개 미만이면 SKIP (AirflowSkipException).
    실제 row 수 확인은 CollaborativeFilteringJob 내부에서 수행하므로
    여기서는 테이블 접근 가능 여부만 확인한다.
    """
    import os
    import psycopg2
    from airflow.exceptions import AirflowSkipException

    jdbc_url = os.environ.get('POSTGRES_JDBC_URL', '')
    db_user  = os.environ.get('POSTGRES_USER', '')
    password = os.environ.get('POSTGRES_PASSWORD', '')

    # jdbc:postgresql://host:port/db → postgresql://host:port/db
    dsn = jdbc_url.replace('jdbc:', '') if jdbc_url.startswith('jdbc:') else jdbc_url

    try:
        conn = psycopg2.connect(dsn, user=db_user, password=password, connect_timeout=10)
        cur = conn.cursor()
        cur.execute("""
            SELECT COUNT(DISTINCT user_id), COUNT(DISTINCT article_id)
            FROM search_logs
            WHERE user_id IS NOT NULL
              AND article_id IS NOT NULL
              AND occurred_at >= NOW() - INTERVAL '30 days'
        """)
        user_count, item_count = cur.fetchone()
        cur.close()
        conn.close()
    except Exception as e:
        raise AirflowSkipException(f"DB 접속 실패, ALS Job SKIP: {e}")

    if user_count < 5 or item_count < 10:
        raise AirflowSkipException(
            f"데이터 부족 (사용자 {user_count}명, 기사 {item_count}개) → ALS Job SKIP"
        )

    print(f"[ALS] 데이터 확인 완료: 사용자 {user_count}명, 기사 {item_count}개")


with DAG(
    dag_id='recommendation_als',
    default_args=default_args,
    schedule_interval='0 3 * * *',   # 매일 새벽 3시 (gold_serving 완료 후)
    start_date=datetime(2025, 1, 1),
    catchup=False,
    max_active_runs=1,
    tags=['recommendation', 'als', 'batch'],
) as dag:

    check_data = PythonOperator(
        task_id='check_minimum_data',
        python_callable=check_minimum_data,
    )

    run_als_job = SparkSubmitOperator(
        task_id='run_collaborative_filtering',
        application='/opt/spark-jobs/airadar-spark.jar',
        java_class='com.mcp.airadar.spark.CollaborativeFilteringJob',
        conn_id='spark_default',
        application_args=['--date', '{{ ds }}'],
        conf=SPARK_CONF,
    )

    check_data >> run_als_job
