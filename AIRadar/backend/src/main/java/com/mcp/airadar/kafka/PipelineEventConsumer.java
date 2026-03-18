package com.mcp.airadar.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mcp.airadar.kafka.dto.PipelineEvent;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;

/**
 * 파이프라인 완료 이벤트 수신기
 *
 * Spark Job이 각 단계를 완료하면 Kafka에 이벤트를 발행한다.
 * 이 Consumer는 해당 이벤트를 수신하여 상태를 기록한다.
 *
 * 구독 토픽:
 *   airader.pipeline.bronze.done — Bronze 적재 완료
 *   airader.pipeline.gold.done   — Gold Upsert 완료
 */
@Component
public class PipelineEventConsumer {

    private static final Logger log = LogManager.getLogger(PipelineEventConsumer.class);
    private final ObjectMapper objectMapper = new ObjectMapper();

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
}
