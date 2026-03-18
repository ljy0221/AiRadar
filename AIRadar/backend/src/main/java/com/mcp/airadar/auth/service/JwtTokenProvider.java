package com.mcp.airadar.auth.service;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Log4j2
@Component
public class JwtTokenProvider {

    private static final String REFRESH_KEY_PREFIX = "refresh:";

    private final SecretKey secretKey;
    private final long accessTokenExpiration;
    private final long refreshTokenExpiration;
    private final StringRedisTemplate redisTemplate;

    public JwtTokenProvider(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.access-token-expiration}") long accessTokenExpiration,
            @Value("${jwt.refresh-token-expiration}") long refreshTokenExpiration,
            StringRedisTemplate redisTemplate) {
        byte[] keyBytes = secret.getBytes();
        // HMAC-SHA256은 최소 32바이트 키 필요
        if (keyBytes.length < 32) {
            byte[] padded = new byte[32];
            System.arraycopy(keyBytes, 0, padded, 0, keyBytes.length);
            keyBytes = padded;
        }
        this.secretKey = Keys.hmacShaKeyFor(keyBytes);
        this.accessTokenExpiration = accessTokenExpiration;
        this.refreshTokenExpiration = refreshTokenExpiration;
        this.redisTemplate = redisTemplate;
    }

    /** Access Token 생성 */
    public String createAccessToken(UUID userId, String role) {
        Date now = new Date();
        return Jwts.builder()
                .subject(userId.toString())
                .claim("role", role)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + accessTokenExpiration))
                .signWith(secretKey)
                .compact();
    }

    /** Refresh Token 생성 후 Redis 저장 */
    public String createRefreshToken(UUID userId) {
        Date now = new Date();
        String token = Jwts.builder()
                .subject(userId.toString())
                .issuedAt(now)
                .expiration(new Date(now.getTime() + refreshTokenExpiration))
                .signWith(secretKey)
                .compact();
        redisTemplate.opsForValue().set(
                REFRESH_KEY_PREFIX + userId,
                token,
                refreshTokenExpiration,
                TimeUnit.MILLISECONDS
        );
        return token;
    }

    /** Refresh Token Rotation: 유효성 검증 + Redis 일치 여부 확인 */
    public boolean validateRefreshToken(UUID userId, String refreshToken) {
        try {
            parseToken(refreshToken);
            String stored = redisTemplate.opsForValue().get(REFRESH_KEY_PREFIX + userId);
            return refreshToken.equals(stored);
        } catch (JwtException e) {
            return false;
        }
    }

    /** Redis에서 Refresh Token 삭제 (로그아웃) */
    public void revokeRefreshToken(UUID userId) {
        redisTemplate.delete(REFRESH_KEY_PREFIX + userId);
    }

    /** Access Token에서 userId 추출 */
    public UUID getUserIdFromToken(String token) {
        String subject = parseToken(token).getPayload().getSubject();
        return UUID.fromString(subject);
    }

    /** 토큰 유효성 검증 (서명 + 만료) */
    public boolean validateAccessToken(String token) {
        try {
            parseToken(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            log.debug("Invalid JWT token: {}", e.getMessage());
            return false;
        }
    }

    private Jws<Claims> parseToken(String token) {
        return Jwts.parser()
                .verifyWith(secretKey)
                .build()
                .parseSignedClaims(token);
    }
}
