from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from hashlib import sha1

from app.config import settings


@dataclass
class RawArchiveResult:
    saved: bool
    key: str
    reason: str | None = None


class S3RawArchiveScaffold:
    """S3 연동 주소/버킷 확정 전까지 키 규격만 보장하는 저장 스캐폴드."""

    def build_key(self, source: str, target: str, url: str) -> str:
        now = datetime.now(timezone.utc)
        digest = sha1(url.encode("utf-8")).hexdigest()
        return (
            f"raw/{source}/{target}/"
            f"{now.year:04d}/{now.month:02d}/{now.day:02d}/{digest}.html"
        )

    def save_html(self, source: str, target: str, url: str, html: str) -> RawArchiveResult:
        key = self.build_key(source=source, target=target, url=url)

        if not settings.s3_bucket:
            return RawArchiveResult(
                saved=False,
                key=key,
                reason="RAW_S3_BUCKET not configured",
            )

        # TODO: bucket/path 확정 후 boto3 업로드 구현.
        _ = html
        return RawArchiveResult(
            saved=False,
            key=key,
            reason="S3 upload scaffold only (address not finalized)",
        )
