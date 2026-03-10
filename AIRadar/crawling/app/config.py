from __future__ import annotations

import os


class Settings:
    user_agent = os.getenv(
        "CRAWLER_USER_AGENT",
        "AiRaderCrawler/0.1 (+https://example.com/contact)",
    )
    request_timeout_sec = float(os.getenv("CRAWLER_TIMEOUT_SEC", "15"))
    request_delay_sec = float(os.getenv("CRAWLER_DELAY_SEC", "1.0"))
    s3_bucket = os.getenv("RAW_S3_BUCKET", "")
    github_token = os.getenv("GITHUB_TOKEN", "")
    kafka_enabled = os.getenv("CRAWLER_KAFKA_ENABLED", "false").strip().lower() in {
        "1",
        "true",
        "yes",
        "on",
    }
    kafka_bootstrap_servers = os.getenv("CRAWLER_KAFKA_BOOTSTRAP_SERVERS", "localhost:29092")
    kafka_topic_prefix = os.getenv("CRAWLER_KAFKA_TOPIC_PREFIX", "airader.raw")
    kafka_client_id = os.getenv("CRAWLER_KAFKA_CLIENT_ID", "airader-crawler")
    kafka_acks = os.getenv("CRAWLER_KAFKA_ACKS", "all")
    kafka_retries = int(os.getenv("CRAWLER_KAFKA_RETRIES", "3"))
    kafka_linger_ms = int(os.getenv("CRAWLER_KAFKA_LINGER_MS", "50"))
    kafka_request_timeout_ms = int(os.getenv("CRAWLER_KAFKA_REQUEST_TIMEOUT_MS", "15000"))


settings = Settings()
