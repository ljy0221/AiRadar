package com.mcp.airadar.mail.controller;

import com.mcp.airadar.mail.dto.MailSubscribeRequest;
import com.mcp.airadar.mail.dto.MailSubscriptionResponse;
import com.mcp.airadar.mail.service.MailService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@Validated
@RestController
@RequestMapping("/api/v1/mail")
@RequiredArgsConstructor
public class MailController {

    private final MailService mailService;

    @PostMapping
    public ResponseEntity<MailSubscriptionResponse> subscribe(@Valid @RequestBody MailSubscribeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(mailService.subscribe(request));
    }

    @DeleteMapping
    public ResponseEntity<Void> unsubscribe(
            @RequestParam @Email String email,
            @RequestParam UUID token
    ) {
        mailService.unsubscribe(email, token);
        return ResponseEntity.noContent().build();
    }
}
