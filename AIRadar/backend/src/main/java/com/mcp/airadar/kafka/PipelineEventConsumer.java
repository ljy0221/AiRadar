package com.mcp.airadar.kafka;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mcp.airadar.dashboard.repository.TechKeywordDailyRepository;
import com.mcp.airadar.kafka.dto.PipelineEvent;
import com.mcp.airadar.kafka.dto.UserEvent;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

/**
 * 파이프라인 완료 이벤트 수신기
 *
 * Spark Job이 각 단계를 완료하면 Kafka에 이벤트를 발행한다.
 * 이 Consumer는 해당 이벤트를 수신하여 상태를 기록하고 후속 작업을 트리거한다.
 *
 * 구독 토픽:
 *   airader.pipeline.bronze.done — Bronze 적재 완료
 *   airader.pipeline.gold.done   — Gold Upsert 완료
 *   airader.user.events          — 사용자 이벤트 (Feedback Loop)
 */
@Component
public class PipelineEventConsumer {

    private static final Logger log = LogManager.getLogger(PipelineEventConsumer.class);
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final TechKeywordDailyRepository keywordDailyRepository;

    public PipelineEventConsumer(TechKeywordDailyRepository keywordDailyRepository) {
        this.keywordDailyRepository = keywordDailyRepository;
    }

    @KafkaListener(
        topics = "airader.pipeline.bronze.done",
        groupId = "airader-backend",
        containerFactory = "kafkaListenerContainerFactory"
    )
    public void onBronzeDone(String message) {
        try {
            PipelineEvent event = objectMapper.readValue(message, PipelineEvent.class);
            log.info("[Pipeline] Bronze 완료 수신: source_type={}, timestamp={}",
                event.sourceType(), event.timestamp());
        } catch (Exception e) {
            log.warn("[Pipeline] Bronze 완료 이벤트 파싱 실패 (무시): {}", e.getMessage());
        }
    }

    @KafkaListener(
        topics = "airader.pipeline.gold.done",
        groupId = "airader-backend",
        containerFactory = "kafkaListenerContainerFactory"
    )
    public void onGoldDone(String message) {
        try {
            PipelineEvent event = objectMapper.readValue(message, PipelineEvent.class);
            log.info("[Pipeline] Gold 완료 수신: batch_date={}, timestamp={}",
                event.batchDate(), event.timestamp());
        } catch (Exception e) {
            log.warn("[Pipeline] Gold 완료 이벤트 파싱 실패 (무시): {}", e.getMessage());
        }
    }

    /**
     * 사용자 이벤트 수신 — Feedback Loop
     *
     * event_type == "search" 일 때 metadata.keyword를 추출하여
     * tech_keyword_daily.search_count를 +1 한다 (UPSERT).
     */
    @KafkaListener(
        topics = "airader.user.events",
        groupId = "airader-backend",
        containerFactory = "kafkaListenerContainerFactory"
    )
    @Transactional
    public void onUserEvent(String message) {
        try {
            UserEvent event = objectMapper.readValue(message, UserEvent.class);
            if (!"search".equals(event.eventType())) {
                return;
            }

            JsonNode metadata = objectMapper.valueToTree(event.metadata());
            JsonNode keywordNode = metadata.path("keyword");
            if (keywordNode.isMissingNode() || keywordNode.isNull()) {
                log.debug("[Feedback] search 이벤트에 keyword 없음 — 무시");
                return;
            }

            String keyword = keywordNode.asText().trim();
            if (keyword.isBlank()) return;

            keywordDailyRepository.upsertSearchCount(keyword, LocalDate.now());
            log.debug("[Feedback] search_count +1: keyword={}", keyword);

        } catch (Exception e) {
            log.warn("[Feedback] 사용자 이벤트 처리 실패 (무시): {}", e.getMessage());
        }
    }
}
