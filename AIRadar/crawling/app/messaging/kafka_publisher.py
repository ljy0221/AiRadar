from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from hashlib import sha1
import json

from kafka import KafkaProducer

from app.config import settings
from app.schemas import CrawledArticle


@dataclass
class KafkaPublishResult:
    enabled: bool
    topic: str | None
    attempted: int
    published: int
    failed: int
    errors: list[str] = field(default_factory=list)
    topic_stats: dict[str, int] = field(default_factory=dict)


class CrawlKafkaPublisher:
    def publish_items(
        self,
        job_id: str,
        domain: str,
        provider: str,
        items: list[CrawledArticle],
    ) -> KafkaPublishResult:
        if not settings.kafka_enabled:
            return KafkaPublishResult(
                enabled=False,
                topic=None,
                attempted=0,
                published=0,
                failed=0,
                errors=[],
                topic_stats={},
            )

        if not items:
            return KafkaPublishResult(
                enabled=True,
                topic=self._topic_for_domain(domain),
                attempted=0,
                published=0,
                failed=0,
                errors=[],
                topic_stats={},
            )

        try:
            producer = KafkaProducer(
                bootstrap_servers=[x.strip() for x in settings.kafka_bootstrap_servers.split(",") if x.strip()],
                client_id=settings.kafka_client_id,
                acks=settings.kafka_acks,
                retries=settings.kafka_retries,
                linger_ms=settings.kafka_linger_ms,
                request_timeout_ms=settings.kafka_request_timeout_ms,
                key_serializer=lambda value: value.encode("utf-8"),
                value_serializer=lambda value: json.dumps(value, ensure_ascii=False).encode("utf-8"),
            )
        except Exception as exc:  # noqa: BLE001
            return KafkaPublishResult(
                enabled=True,
                topic=None,
                attempted=len(items),
                published=0,
                failed=len(items),
                errors=[f"producer init failed: {exc}"],
                topic_stats={},
            )

        attempted = len(items)
        published = 0
        failed = 0
        errors: list[str] = []
        topic_stats: dict[str, int] = {}

        try:
            for item in items:
                topic = self._topic_for_item(domain=domain, target=item.target)
                key = sha1(item.url.encode("utf-8")).hexdigest()
                event = self._build_event(
                    job_id=job_id,
                    domain=domain,
                    provider=provider,
                    item=item,
                )
                try:
                    producer.send(topic, key=key, value=event).get(timeout=10)
                    published += 1
                    topic_stats[topic] = topic_stats.get(topic, 0) + 1
                except Exception as exc:  # noqa: BLE001
                    failed += 1
                    errors.append(f"{item.url} -> {exc}")
        finally:
            producer.flush(timeout=10)
            producer.close(timeout=10)

        return KafkaPublishResult(
            enabled=True,
            topic=self._topic_for_domain(domain),
            attempted=attempted,
            published=published,
            failed=failed,
            errors=errors,
            topic_stats=topic_stats,
        )

    @staticmethod
    def _topic_for_domain(domain: str) -> str:
        return f"{settings.kafka_topic_prefix}.{domain}"

    @staticmethod
    def _topic_for_item(domain: str, target: str) -> str:
        if domain == "github_archive" and target == "trending_repo":
            return f"{settings.kafka_topic_prefix}.github.trending_repo"
        if domain == "github_archive" and target == "repo_pr_document":
            return f"{settings.kafka_topic_prefix}.github.repo_pr_document"
        return f"{settings.kafka_topic_prefix}.{domain}"

    @staticmethod
    def _build_event(
        job_id: str,
        domain: str,
        provider: str,
        item: CrawledArticle,
    ) -> dict[str, object]:
        return {
            "schema_version": "1.0",
            "event_type": "crawl.item.collected",
            "event_time": datetime.now(timezone.utc).isoformat(),
            "job_id": job_id,
            "domain": domain,
            "provider": provider,
            "source": item.source,
            "target": item.target,
            "payload": item.model_dump(mode="json"),
        }
