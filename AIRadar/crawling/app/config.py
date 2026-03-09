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


settings = Settings()
