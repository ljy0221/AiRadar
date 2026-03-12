package com.mcp.airadar.common.controller;

import com.mcp.airadar.kafka.UserEventProducer;
import com.mcp.airadar.kafka.dto.UserEvent;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 사용자 이벤트 수신 엔드포인트
 *
 * Next.js → POST /api/events/user → Kafka airader.user.events
 * Next.js → POST /api/events/feedback → Kafka airader.user.feedback
 */
@RestController
@RequestMapping("/api/events")
public class EventController {

    private final UserEventProducer userEventProducer;

    public EventController(UserEventProducer userEventProducer) {
        this.userEventProducer = userEventProducer;
    }

    @PostMapping("/user")
    public ResponseEntity<Void> trackUserEvent(@RequestBody UserEvent event) {
        userEventProducer.publish(event);
        return ResponseEntity.accepted().build();
    }

    @PostMapping("/feedback")
    public ResponseEntity<Void> submitFeedback(@RequestBody UserEvent event) {
        userEventProducer.publishFeedback(event);
        return ResponseEntity.accepted().build();
    }
}
