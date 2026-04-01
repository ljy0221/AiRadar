package com.mcp.airadar.kafka.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record UserEvent(
    @JsonProperty("event_type") String eventType,
    @JsonProperty("page")       String page,
    @JsonProperty("user_id")    String userId,
    @JsonProperty("metadata")   Object metadata
) {}
