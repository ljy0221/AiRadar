package com.mcp.airadar.mail.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record MailSubscribeRequest(
        @Email @NotBlank String email,
        String jobCategory
) {
}
