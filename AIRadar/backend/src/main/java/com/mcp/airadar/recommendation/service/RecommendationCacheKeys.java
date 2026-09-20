package com.mcp.airadar.recommendation.service;

import java.util.UUID;

/**
 * 추천 캐시·프로파일의 Redis 키 단일 출처.
 * 서빙(RecommendationService)과 무효화(UserEventService)가 같은 키를 쓰도록 여기서만 정의한다.
 */
public final class RecommendationCacheKeys {

    /**
     * 프로파일 Hash 안에서 변경 횟수를 세는 필드.
     * 무효화 시 증가시키고, 서빙은 계산 전후 값이 같을 때만 결과를 캐시에 저장한다.
     */
    public static final String PROFILE_REVISION_FIELD = "rev";

    private RecommendationCacheKeys() {
    }

    public static String news(UUID userId) {
        return "user:%s:recommendations".formatted(userId);
    }

    public static String paper(UUID userId) {
        return "user:%s:paper-recommendations".formatted(userId);
    }

    public static String profile(UUID userId) {
        return "user:%s:profile".formatted(userId);
    }
}
