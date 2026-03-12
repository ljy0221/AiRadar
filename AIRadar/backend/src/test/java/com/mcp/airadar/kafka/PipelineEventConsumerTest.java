package com.mcp.airadar.kafka;

import com.mcp.airadar.dashboard.repository.TechKeywordDailyRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PipelineEventConsumerTest {

    @Mock
    private TechKeywordDailyRepository keywordDailyRepository;

    @InjectMocks
    private PipelineEventConsumer consumer;

    @Test
    @DisplayName("event_type=search, keyword 있음 → upsertSearchCount 1회 호출")
    void onUserEvent_searchWithKeyword() {
        String message = """
                {
                  "event_type": "search",
                  "page": "home",
                  "user_id": "u-001",
                  "metadata": {"keyword": "RAG"}
                }
                """;

        consumer.onUserEvent(message);

        verify(keywordDailyRepository, times(1)).upsertSearchCount(eq("RAG"), any(LocalDate.class));
    }

    @Test
    @DisplayName("event_type=click → upsertSearchCount 미호출")
    void onUserEvent_nonSearchEvent() {
        String message = """
                {
                  "event_type": "click",
                  "page": "news",
                  "user_id": "u-001",
                  "metadata": {"article_id": "abc"}
                }
                """;

        consumer.onUserEvent(message);

        verify(keywordDailyRepository, never()).upsertSearchCount(any(), any());
    }

    @Test
    @DisplayName("metadata.keyword 없음 → upsertSearchCount 미호출")
    void onUserEvent_searchWithoutKeyword() {
        String message = """
                {
                  "event_type": "search",
                  "page": "home",
                  "user_id": "u-001",
                  "metadata": {}
                }
                """;

        consumer.onUserEvent(message);

        verify(keywordDailyRepository, never()).upsertSearchCount(any(), any());
    }

    @Test
    @DisplayName("keyword가 빈 문자열 → upsertSearchCount 미호출")
    void onUserEvent_emptyKeyword() {
        String message = """
                {
                  "event_type": "search",
                  "metadata": {"keyword": "   "}
                }
                """;

        consumer.onUserEvent(message);

        verify(keywordDailyRepository, never()).upsertSearchCount(any(), any());
    }

    @Test
    @DisplayName("잘못된 JSON → 예외 없이 무시")
    void onUserEvent_invalidJson() {
        consumer.onUserEvent("{ invalid json }");
        verify(keywordDailyRepository, never()).upsertSearchCount(any(), any());
    }
}
