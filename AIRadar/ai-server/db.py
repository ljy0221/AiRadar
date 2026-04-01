import os

import psycopg2


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
        VALUES (%s, %s, %s::vector)
        ON CONFLICT (content_id)
        DO UPDATE SET
            embedding  = EXCLUDED.embedding,
            updated_at = NOW()
    """

    with _get_conn() as conn, conn.cursor() as cur:
        for content_id, content_type, embedding in items:
            cur.execute(sql, (content_id, content_type, str(embedding)))
        conn.commit()
