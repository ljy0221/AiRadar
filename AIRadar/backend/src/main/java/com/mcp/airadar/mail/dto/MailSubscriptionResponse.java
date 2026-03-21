package com.mcp.airadar.mail.dto;

public record MailSubscriptionResponse(
        String email,
        String jobCategory,
        boolean subscribed
) {
}
