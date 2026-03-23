package com.mcp.airadar.mail.dto;

import java.time.LocalDateTime;
import java.util.List;

public record MailSendResponse(
        String email,
        String subject,
        String jobCategory,
        String summary,
        List<String> highlights,
        LocalDateTime sentAt,
        boolean mock
) {
}
