from __future__ import annotations

from datetime import datetime, timedelta
import os

import requests
from airflow import DAG
from airflow.operators.python import PythonOperator


default_args = {
    "owner": "ai-rader",
    "retries": 2,
    "retry_delay": timedelta(minutes=3),
    "email_on_failure": False,
    "depends_on_past": False,
    "execution_timeout": timedelta(minutes=20),
}


def _trigger_crawl(payload: dict) -> None:
    base_url = os.getenv("CRAWLING_API_BASE_URL", "http://host.docker.internal:8002").rstrip("/")
    url = f"{base_url}/crawl/jobs"
    resp = requests.post(url, json=payload, timeout=300)
    resp.raise_for_status()
    data = resp.json()
    print(
        "crawl done",
        {
            "domain": data.get("domain"),
            "provider": data.get("provider"),
            "crawled_count": data.get("crawled_count"),
            "failed_count": data.get("failed_count"),
            "kafka": (data.get("metadata") or {}).get("kafka"),
        },
    )


with DAG(
    dag_id="crawl_news_to_kafka",
    default_args=default_args,
    schedule_interval="*/30 * * * *",
    start_date=datetime(2025, 1, 1),
    catchup=False,
    max_active_runs=1,    # 동시 실행 1개로 제한 (크롤링 서버 과부하 방지)
    tags=["crawl", "news", "kafka"],
) as dag:
    crawl_aitimes = PythonOperator(
        task_id="crawl_aitimes",
        python_callable=_trigger_crawl,
        op_kwargs={
            "payload": {
                "domain": "news",
                "provider": "aitimes",
                "targets": ["ai_industry", "ai_company"],
                "max_pages_per_target": 1,
                "max_articles": 40,
            }
        },
    )

    crawl_gdelt = PythonOperator(
        task_id="crawl_gdelt",
        python_callable=_trigger_crawl,
        op_kwargs={
            "payload": {
                "domain": "news",
                "provider": "gdelt",
                "window_minutes": 60,
                "max_articles": 120,
            }
        },
    )

    [crawl_aitimes, crawl_gdelt]
