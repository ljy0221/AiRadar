import importlib.util
import sys
import types
from pathlib import Path

# ai-server 모듈들은 패키지가 아니라 최상위 import(`import db`)를 쓰므로 경로를 추가한다.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


def _stub_if_missing(name: str, **attrs) -> None:
    """무거운 의존성(모델·DB 드라이버)이 없는 환경에서도 테스트가 import 되도록 가짜 모듈을 넣는다.

    테스트는 이 모듈들을 직접 호출하지 않고 monkeypatch로 대체하므로 실제 설치 여부와 무관하다.
    """
    if importlib.util.find_spec(name.split(".")[0]) is not None:
        return
    module = types.ModuleType(name)
    for key, value in attrs.items():
        setattr(module, key, value)
    sys.modules[name] = module


_stub_if_missing("sentence_transformers", SentenceTransformer=object)
_stub_if_missing("psycopg2", connect=None)
if "psycopg2" in sys.modules and not hasattr(sys.modules["psycopg2"], "extras"):
    extras = types.ModuleType("psycopg2.extras")
    extras.execute_values = None
    sys.modules["psycopg2"].extras = extras
    sys.modules["psycopg2.extras"] = extras
