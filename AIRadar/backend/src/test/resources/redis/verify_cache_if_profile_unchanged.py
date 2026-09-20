"""
cache_if_profile_unchanged.lua 의 동작을 fakeredis(Lua 지원)로 검증한다.

실제 Redis가 없는 환경에서도 스크립트 의미를 확인하기 위한 도구이며, 단위 테스트(mock)가 검증하지 못하는
"스크립트 본문이 인자를 어떻게 처리하는가"를 다룬다. 스크립트를 수정했다면 반드시 다시 실행하고,
RecommendationCacheScriptChecksumTest 의 기대 SHA-1을 함께 갱신할 것.

    pip install "fakeredis[lua]"
    python verify_cache_if_profile_unchanged.py

실제 Redis가 있으면 같은 케이스를 그대로 실제 Lua 엔진으로 검증할 수 있다 (fakeredis는 에뮬레이터이므로 이쪽이 더 확실하다).

    docker run -d --name airadar-redis-verify -p 6390:6379 redis:7-alpine
    REDIS_URL=redis://localhost:6390/15 python verify_cache_if_profile_unchanged.py

주의: REDIS_URL을 주면 해당 DB에 FLUSHALL을 실행하므로 반드시 검증 전용 인스턴스를 가리킬 것.
"""
import os
import pathlib
import sys

import fakeredis
import redis as redis_lib

sys.stdout.reconfigure(encoding="utf-8")  # Windows 콘솔에서도 한글이 깨지지 않도록

SCRIPT_PATH = (pathlib.Path(__file__).resolve().parents[3]
               / "main" / "resources" / "redis" / "cache_if_profile_unchanged.lua")
SCRIPT = SCRIPT_PATH.read_text(encoding="utf-8")
TTL_MS = 1_800_000

REDIS_URL = os.environ.get("REDIS_URL")
if REDIS_URL:
    r = redis_lib.Redis.from_url(REDIS_URL)
    print(f"[실제 Redis] {REDIS_URL} — {r.info('server')['redis_version']}")
else:
    r = fakeredis.FakeStrictRedis()
    print("[fakeredis 에뮬레이터]")


def run(rev_at_start: str) -> int:
    # KEYS = [프로파일, 캐시], ARGV = [필드명, 계산 시작 시점 rev, 값, TTL(ms)]
    return r.eval(SCRIPT, 2, "profile", "cache", "rev", rev_at_start, "payload", str(TTL_MS))


def case(name, setup, rev_at_start, expect_stored):
    r.flushall()
    setup()
    result = run(rev_at_start)
    stored = r.get("cache") == b"payload"
    ok = (result == 1) == expect_stored and stored == expect_stored
    if expect_stored:
        ok = ok and 0 < r.pttl("cache") <= TTL_MS  # TTL 단위(ms)까지 확인
    print(("PASS " if ok else "FAIL ") + name)
    return ok


results = [
    case("rev 없음 → 없음: 저장", lambda: None, "", True),
    case("rev 같음: 저장 + TTL 적용", lambda: r.hset("profile", "rev", "3"), "3", True),
    case("rev 변경(3 → 4): 건너뜀", lambda: r.hset("profile", "rev", "4"), "3", False),
    case("rev 생김(없음 → 1): 건너뜀", lambda: r.hset("profile", "rev", "1"), "", False),
    case("rev 사라짐(3 → 없음, 프로파일 만료): 건너뜀", lambda: None, "3", False),
    case("HINCRBY 결과 문자열과 그대로 비교", lambda: r.hincrby("profile", "rev", 7), "7", True),
    case("기존 캐시가 있어도 rev가 다르면 덮어쓰지 않음",
         lambda: (r.hset("profile", "rev", "9"), r.set("cache", b"old")), "8", False),
]

# 마지막 케이스는 'payload'가 저장되지 않았고 기존 값이 유지되는지도 확인
r.flushall()
r.hset("profile", "rev", "9")
r.set("cache", b"old")
run("8")
kept = r.get("cache") == b"old"
print(("PASS " if kept else "FAIL ") + "건너뛸 때 기존 캐시 값 보존")
results.append(kept)

sys.exit(0 if all(results) else 1)
