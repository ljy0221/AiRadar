import os
from contextlib import closing

import psycopg2
from psycopg2.extras import execute_values


def _get_conn():
    return psycopg2.connect(
        host=os.environ["POSTGRES_HOST"],
        port=os.getenv("POSTGRES_PORT", "5432"),
        dbname=os.environ["POSTGRES_DB"],
        user=os.environ["POSTGRES_USER"],
        password=os.environ["POSTGRES_PASSWORD"],
    )


def save_embeddings(items: list[tuple[str, str, list[float]]]) -> None:
    """content_embeddings 테이블에 Upsert.

    items: list of (content_id, content_type, embedding)
      content_type: 'NEWS' | 'PAPER' | 'GITHUB'
    """
    if not items:
        return

    sql = """
        INSERT INTO content_embeddings (content_id, content_type, embedding)
        VALUES %s
        ON CONFLICT (content_id)
        DO UPDATE SET
            embedding  = EXCLUDED.embedding,
            updated_at = NOW()
    """

    # psycopg2의 `with conn`은 트랜잭션만 커밋/롤백하고 연결은 닫지 않으므로 closing으로 감싼다.
    with closing(_get_conn()) as conn, conn, conn.cursor() as cur:
        execute_values(
            cur,
            sql,
            [(content_id, content_type, str(embedding)) for content_id, content_type, embedding in items],
            template="(%s, %s, %s::vector)",
        )
