package com.mcp.airadar.auth.service;

import com.mcp.airadar.auth.dto.LoginRequest;
import com.mcp.airadar.auth.dto.RefreshRequest;
import com.mcp.airadar.auth.dto.RegisterRequest;
import com.mcp.airadar.auth.dto.TokenResponse;
import com.mcp.airadar.auth.entity.User;
import com.mcp.airadar.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    /** 회원가입 */
    @Transactional
    public TokenResponse register(RegisterRequest req) {
        if (userRepository.existsByEmail(req.email())) {
            throw new IllegalArgumentException("이미 사용 중인 이메일입니다.");
        }
        User user = User.builder()
                .email(req.email())
                .password(passwordEncoder.encode(req.password()))
                .name(req.name())
                .build();
        userRepository.save(user);
        return issueTokens(user);
    }

    /** 로그인 */
    @Transactional(readOnly = true)
    public TokenResponse login(LoginRequest req) {
        User user = userRepository.findByEmail(req.email())
                .orElseThrow(() -> new IllegalArgumentException("이메일 또는 비밀번호가 올바르지 않습니다."));
        if (!passwordEncoder.matches(req.password(), user.getPassword())) {
            throw new IllegalArgumentException("이메일 또는 비밀번호가 올바르지 않습니다.");
        }
        return issueTokens(user);
    }

    /** Refresh Token 갱신 (Rotation) */
    @Transactional
    public TokenResponse refresh(RefreshRequest req) {
        UUID userId;
        try {
            userId = jwtTokenProvider.getUserIdFromToken(req.refreshToken());
        } catch (Exception e) {
            throw new IllegalArgumentException("유효하지 않은 Refresh Token입니다.");
        }

        if (!jwtTokenProvider.validateRefreshToken(userId, req.refreshToken())) {
            jwtTokenProvider.revokeRefreshToken(userId);
            throw new IllegalArgumentException("Refresh Token이 만료되었거나 재사용되었습니다.");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다."));
        return issueTokens(user);
    }

    /** 로그아웃 */
    public void logout(UUID userId) {
        jwtTokenProvider.revokeRefreshToken(userId);
    }

    private TokenResponse issueTokens(User user) {
        String accessToken  = jwtTokenProvider.createAccessToken(user.getId(), user.getRole().name());
        String refreshToken = jwtTokenProvider.createRefreshToken(user.getId());
        return TokenResponse.of(accessToken, refreshToken, user.isOnboardingCompleted());
    }
}
