import pytest

import db


class FakeCursor:
    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False


class FakeConn:
    def __init__(self):
        self.committed = False
        self.closed = False

    def cursor(self):
        return FakeCursor()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, *exc):
        self.committed = exc_type is None
        return False

    def close(self):
        self.closed = True


def test_save_embeddings_upserts_in_one_batch_and_closes_connection(monkeypatch):
    conn = FakeConn()
    calls = []
    monkeypatch.setattr(db, "_get_conn", lambda: conn)
    monkeypatch.setattr(db, "execute_values", lambda cur, sql, rows, template: calls.append((sql, rows, template)))

    db.save_embeddings([("n1", "NEWS", [0.1, 0.2]), ("p1", "PAPER", [0.3])])

    assert len(calls) == 1
    sql, rows, template = calls[0]
    assert "ON CONFLICT (content_id)" in sql
    assert rows == [("n1", "NEWS", "[0.1, 0.2]"), ("p1", "PAPER", "[0.3]")]
    assert template == "(%s, %s, %s::vector)"
    assert conn.committed and conn.closed


def test_save_embeddings_closes_connection_on_error(monkeypatch):
    conn = FakeConn()
    monkeypatch.setattr(db, "_get_conn", lambda: conn)

    def boom(*args, **kwargs):
        raise RuntimeError("db down")

    monkeypatch.setattr(db, "execute_values", boom)

    with pytest.raises(RuntimeError):
        db.save_embeddings([("n1", "NEWS", [0.1])])

    assert not conn.committed and conn.closed


def test_save_embeddings_skips_db_when_empty(monkeypatch):
    def fail():
        raise AssertionError("빈 입력에서 DB에 연결하면 안 됨")

    monkeypatch.setattr(db, "_get_conn", fail)

    db.save_embeddings([])
