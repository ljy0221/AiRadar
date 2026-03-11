package com.mcp.airadar.kafka.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record PipelineEvent(
    @JsonProperty("event_type")  String eventType,
    @JsonProperty("source_type") String sourceType,
    @JsonProperty("batch_date")  String batchDate,
    @JsonProperty("timestamp")   String timestamp
) {}
