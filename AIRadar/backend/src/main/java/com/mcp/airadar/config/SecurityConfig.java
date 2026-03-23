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
                        .requestMatchers("/").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/**").permitAll()
                        .requestMatchers("/actuator/health", "/health", "/api/health").permitAll()
                        .requestMatchers("/api/v1/news/**", "/api/v1/paper/**", "/api/v1/papers/**",
                                "/api/v1/search/**", "/api/v1/dashboard/**",
                                "/api/v1/github/**", "/api/v1/mail/**",
                                "/api/v1/mock/**").permitAll()
                        .requestMatchers(HttpMethod.GET,
                                "/api/v1/recommendations/trending",
                                "/api/v1/recommendations/trending/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/events/search").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/events/article-view").permitAll()
                        .anyRequest().authenticated()
                )
                .addFilterBefore(new JwtAuthenticationFilter(jwtTokenProvider),
                        UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }
}
