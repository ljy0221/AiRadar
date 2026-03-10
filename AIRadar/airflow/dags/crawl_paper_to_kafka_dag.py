from __future__ import annotations

from datetime import datetime, timedelta
import os

import requests
from airflow import DAG
from airflow.operators.python import PythonOperator


default_args = {
    "owner": "ai-rader",
    "retries": 2,
    "retry_delay": timedelta(minutes=5),
    "email_on_failure": False,
    "depends_on_past": False,
    "execution_timeout": timedelta(minutes=20),
}


def _trigger_arxiv_crawl() -> None:
    base_url = os.getenv("CRAWLING_API_BASE_URL", "http://host.docker.internal:8002").rstrip("/")
    url = f"{base_url}/crawl/jobs"
    payload = {
        "domain": "paper",
        "provider": "arxiv_api",
        "max_articles": 60,
    }
    resp = requests.post(url, json=payload, timeout=180)
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
    dag_id="crawl_paper_to_kafka",
    default_args=default_args,
    schedule_interval="0 */3 * * *",
    start_date=datetime(2025, 1, 1),
    catchup=False,
    tags=["crawl", "paper", "kafka"],
) as dag:
    crawl_arxiv = PythonOperator(
        task_id="crawl_arxiv_cs_ai",
        python_callable=_trigger_arxiv_crawl,
    )
