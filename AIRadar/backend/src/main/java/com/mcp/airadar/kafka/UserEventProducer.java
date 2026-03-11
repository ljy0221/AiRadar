package com.mcp.airadar.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mcp.airadar.kafka.dto.UserEvent;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

/**
 * 사용자 이벤트 Kafka 발행기
 *
 * Next.js → Spring Boot REST → 이 Producer → Kafka airader.user.events
 */
@Component
public class UserEventProducer {

    private static final Logger log = LogManager.getLogger(UserEventProducer.class);
    private static final String USER_EVENTS_TOPIC = "airader.user.events";
    private static final String FEEDBACK_TOPIC = "airader.user.feedback";

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public UserEventProducer(KafkaTemplate<String, String> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public void publish(UserEvent event) {
        try {
            String payload = objectMapper.writeValueAsString(event);
            kafkaTemplate.send(USER_EVENTS_TOPIC, event.userId(), payload);
            log.debug("[UserEvent] 발행: event_type={}, page={}", event.eventType(), event.page());
        } catch (Exception e) {
            log.warn("[UserEvent] 발행 실패 (무시): {}", e.getMessage());
        }
    }

    public void publishFeedback(UserEvent event) {
        try {
            String payload = objectMapper.writeValueAsString(event);
            kafkaTemplate.send(FEEDBACK_TOPIC, event.userId(), payload);
            log.debug("[UserFeedback] 발행: event_type={}", event.eventType());
        } catch (Exception e) {
            log.warn("[UserFeedback] 발행 실패 (무시): {}", e.getMessage());
        }
    }
}
