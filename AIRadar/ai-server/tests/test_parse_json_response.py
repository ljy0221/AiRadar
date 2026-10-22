import pytest

from analyzer import _parse_json_response


def test_parses_plain_array():
    assert _parse_json_response('[{"a": 1}, {"a": 2}]') == [{"a": 1}, {"a": 2}]


def test_strips_json_code_block():
    raw = '```json\n[{"a": 1}]\n```'
    assert _parse_json_response(raw) == [{"a": 1}]


def test_ignores_text_before_and_after_array():
    raw = 'Here is the result:\n[{"a": 1}]\nHope this helps! [not json]'
    assert _parse_json_response(raw) == [{"a": 1}]


def test_recovers_complete_objects_from_truncated_array():
    raw = '[{"a": 1}, {"a": 2}, {"a": 3, "summary": "잘린 문'
    assert _parse_json_response(raw) == [{"a": 1}, {"a": 2}]


def test_braces_and_escaped_quotes_inside_strings_do_not_break_recovery():
    raw = '[{"s": "a } \\" { b"}, {"s": "cut'
    assert _parse_json_response(raw) == [{"s": 'a } " { b'}]


def test_raises_when_no_array():
    with pytest.raises(ValueError, match="JSON 배열을 찾을 수 없음"):
        _parse_json_response('{"a": 1}')


def test_raises_when_nothing_recoverable():
    with pytest.raises(ValueError, match="JSON 파싱 실패"):
        _parse_json_response('[{"a": ')
