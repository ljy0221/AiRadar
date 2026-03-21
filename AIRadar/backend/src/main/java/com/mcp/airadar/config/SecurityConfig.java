package com.mcp.airadar.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import com.mcp.airadar.auth.service.JwtAuthenticationFilter;
import com.mcp.airadar.auth.service.JwtTokenProvider;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtTokenProvider jwtTokenProvider;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // 루트 경로 공개 (nginx 기본 요청 대응)
                        .requestMatchers("/").permitAll()

                        // 인증 API 공개
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/**").permitAll()

                        // 헬스체크 공개
                        .requestMatchers("/actuator/health", "/health", "/api/health").permitAll()

                        // 기존 뉴스/검색/대시보드 API 공개 유지
                        .requestMatchers("/api/v1/news/**", "/api/v1/papers/**",
                                "/api/v1/search/**", "/api/v1/dashboard/**",
                                "/api/v1/github/**",
                                "/api/v1/mock/**").permitAll()

                        // 트렌딩 조회 — 비로그인 포함 공개
                        .requestMatchers(HttpMethod.GET,
                                "/api/v1/recommendations/trending",
                                "/api/v1/recommendations/trending/**").permitAll()

                        // 이벤트 API — 검색/기사조회는 비로그인도 허용 (userId null 처리됨)
                        .requestMatchers(HttpMethod.POST, "/api/v1/events/search").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/events/article-view").permitAll()

                        // 나머지는 인증 필요
                        .anyRequest().authenticated()
                )
                // JWT 인증 필터 적용
                .addFilterBefore(new JwtAuthenticationFilter(jwtTokenProvider),
                        UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }
}
