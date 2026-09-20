-- 프로파일 revision이 계산 시작 시점과 같을 때만 추천 결과를 캐시에 저장한다 (확인과 저장을 한 번에).
-- KEYS[1] = 프로파일 Hash, KEYS[2] = 캐시 키
-- ARGV[1] = revision 필드명, ARGV[2] = 계산 시작 시점 revision (필드가 없었으면 빈 문자열)
-- ARGV[3] = 캐시 값(JSON), ARGV[4] = TTL(ms)
-- 저장하면 1, 건너뛰면 0을 반환한다.
-- 주의: rev 필드는 HINCRBY로만 기록되므로 항상 정수 문자열이다 (빈 문자열이 될 수 없음).
local current = redis.call('HGET', KEYS[1], ARGV[1])
local unchanged
if current == false then
  unchanged = (ARGV[2] == '')
else
  unchanged = (current == ARGV[2])
end
if unchanged then
  redis.call('SET', KEYS[2], ARGV[3], 'PX', ARGV[4])
  return 1
end
return 0
