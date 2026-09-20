package com.mcp.airadar.recommendation.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 캐시 저장용 Lua 스크립트가 검증 없이 바뀌지 않도록 내용을 고정한다.
 * 스크립트 본문은 단위 테스트(mock)로는 검증되지 않으므로,
 * 고쳤다면 src/test/resources/redis/verify_cache_if_profile_unchanged.py 를 다시 실행해 통과를 확인한 뒤
 * 아래 기대 SHA-1을 갱신해야 한다.
 */
class RecommendationCacheScriptChecksumTest {

    // 줄바꿈(LF/CRLF) 차이로 체크아웃 환경마다 값이 달라지지 않도록 LF로 정규화한 본문의 SHA-1
    private static final String EXPECTED_SHA1 = "48266852b553554484edb90b98f48a39d24e2910";

    @Test
    @DisplayName("캐시 저장 Lua 스크립트가 검증된 버전과 같다 (바뀌었다면 verify_cache_if_profile_unchanged.py 재실행)")
    void script_matchesVerifiedVersion() throws Exception {
        String script = RecommendationService.CACHE_IF_PROFILE_UNCHANGED.getScriptAsString()
                .replace("\r\n", "\n");

        String sha1 = HexFormat.of().formatHex(
                MessageDigest.getInstance("SHA-1").digest(script.getBytes(StandardCharsets.UTF_8)));

        assertThat(sha1)
                .as("스크립트가 수정됨 — verify_cache_if_profile_unchanged.py 재실행 후 EXPECTED_SHA1 갱신 필요")
                .isEqualTo(EXPECTED_SHA1);
    }

    @Test
    @DisplayName("스크립트는 정수(Long) 결과를 반환하도록 등록되어 있다")
    void script_returnsLong() {
        assertThat(RecommendationService.CACHE_IF_PROFILE_UNCHANGED.getResultType()).isEqualTo(Long.class);
    }
}
