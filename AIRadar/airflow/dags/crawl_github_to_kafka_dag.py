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
    "execution_timeout": timedelta(minutes=25),
}


def _trigger_github_crawl() -> None:
    base_url = os.getenv("CRAWLING_API_BASE_URL", "http://host.docker.internal:8002").rstrip("/")
    url = f"{base_url}/crawl/jobs"
    payload = {
        "domain": "github_archive",
        "provider": "github_trending_archive",
        "max_articles": 120,
        "github_window_hours": 3,
        "github_top_n": 20,
        "github_pr_per_repo": 3,
    }
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
    dag_id="crawl_github_to_kafka",
    default_args=default_args,
    schedule_interval="0 */3 * * *",
    start_date=datetime(2025, 1, 1),
    catchup=False,
    tags=["crawl", "github", "kafka"],
) as dag:
    crawl_github_archive = PythonOperator(
        task_id="crawl_github_trending_archive",
        python_callable=_trigger_github_crawl,
    )
