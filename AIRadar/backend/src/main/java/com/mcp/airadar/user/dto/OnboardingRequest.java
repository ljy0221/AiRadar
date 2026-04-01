package com.mcp.airadar.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record OnboardingRequest(
        @NotEmpty(message = "관심 키워드를 1개 이상 선택해주세요.")
        @Size(min = 1, max = 10, message = "관심 키워드는 1~10개까지 선택 가능합니다.")
        List<@NotBlank String> keywords
) {}
