from datetime import datetime, timedelta

from airflow import DAG
from airflow.providers.apache.spark.operators.spark_submit import SparkSubmitOperator
from airflow.operators.python import PythonOperator

default_args = {
    'owner': 'ai-radar',
    'retries': 1,
    'retry_delay': timedelta(minutes=10),
    'email_on_failure': False,
    'depends_on_past': False,
    'execution_timeout': timedelta(hours=2),
}

# ALS Job은 메모리를 많이 사용하므로 executor 1개, 메모리 최대화
SPARK_CONF = {
    'spark.master': 'spark://spark-master:7077',
    'spark.executor.memory': '2g',
    'spark.executor.cores': '2',
    'spark.executor.instances': '1',
    'spark.driver.memory': '1g',
    # ALS 반복 학습 중 broadcast 최적화
    'spark.sql.autoBroadcastJoinThreshold': '-1',
    'spark.serializer': 'org.apache.spark.serializer.KryoSerializer',
}


def check_min_event_count(**context):
    """
    search_logs에 충분한 이벤트가 쌓였는지 확인.
    30일치 로그인 이벤트가 100건 미만이면 ALS 학습 의미 없음 → skip.
    """
    import psycopg2
    import os

    conn = psycopg2.connect(
        host=os.environ['POSTGRES_HOST'],
        port=os.environ.get('POSTGRES_PORT', '5432'),
        dbname=os.environ['POSTGRES_DB'],
        user=os.environ['POSTGRES_USER'],
        password=os.environ['POSTGRES_PASSWORD'],
    )
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT COUNT(*)
                FROM search_logs
                WHERE occurred_at >= NOW() - INTERVAL '30 days'
                  AND user_id IS NOT NULL
                  AND event_type IN ('ARTICLE_LIKED', 'ARTICLE_BOOKMARKED', 'ARTICLE_VIEWED')
            """)
            count = cur.fetchone()[0]

        if count < 100:
            raise ValueError(
                f"[Rec Batch] 이벤트 수 부족 ({count}건) — ALS 학습 skip. "
                "100건 이상 쌓이면 자동 재시작됩니다."
            )

        context['ti'].xcom_push(key='event_count', value=count)
        print(f"[Rec Batch] 충분한 이벤트 확인: {count}건 → ALS 학습 진행")
    finally:
        conn.close()


with DAG(
    dag_id='recommendation_batch',
    default_args=default_args,
    schedule_interval='0 2 * * *',  # 매일 새벽 2시 (Gold 완료 후 여유 확보)
    start_date=datetime(2025, 1, 1),
    catchup=False,
    max_active_runs=1,
    tags=['recommendation', 'batch', 'als'],
) as dag:

    # 이벤트 수 사전 확인 (ALS는 cold data에서 의미 없음)
    check_events = PythonOperator(
        task_id='check_min_event_count',
        python_callable=check_min_event_count,
    )

    # ALS 협업 필터링 Spark Job
    # - PostgreSQL search_logs 직접 읽기 (Kafka Delta Lake 대체)
    # - user-item 행렬 → ALS 학습 → user_recommendations 저장
    run_recommendation_job = SparkSubmitOperator(
        task_id='run_recommendation_batch',
        application='/opt/spark-jobs/airadar-spark.jar',
        java_class='com.mcp.airadar.spark.UserRecommendationBatchJob',
        conn_id='spark_default',
        application_args=['--date', '{{ ds }}'],
        conf=SPARK_CONF,
    )

    check_events >> run_recommendation_job
