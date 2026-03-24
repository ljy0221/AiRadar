package com.mcp.airadar.jobforecast.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.LocalDate;
import java.util.List;

@Component
public class JobForecastAiClient {

    private final RestClient restClient;

    public JobForecastAiClient(@Value("${job-forecast.ai.base-url:http://ai-server:8000}") String baseUrl) {
        this.restClient = RestClient.builder().baseUrl(baseUrl).build();
    }

    public GenerateJobForecastResponse generate(GenerateJobForecastRequest request) {
        GenerateJobForecastResponse response = restClient.post()
                .uri("/job-forecasts/generate")
                .body(request)
                .retrieve()
                .body(GenerateJobForecastResponse.class);

        if (response == null || response.tasks() == null || response.tasks().isEmpty()) {
            throw new IllegalStateException("AI server returned an empty job forecast response.");
        }
        return response;
    }

    public record GenerateJobForecastRequest(
            String jobCode,
            String jobName,
            LocalDate forecastMonth,
            List<CoreTaskInput> coreTasks
    ) {
        public record CoreTaskInput(
                String taskKey,
                String taskTitle,
                String taskDescription,
                Integer displayOrder
        ) {}
    }

    public record GenerateJobForecastResponse(
            String modelName,
            String promptVersion,
            List<TaskResult> tasks
    ) {
        public record TaskResult(
                String taskKey,
                String taskTitle,
                String impactSummary,
                DetailedScenario detailedScenario,
                List<String> humanStrengths,
                List<String> recommendedSkills,
                List<String> promisingTools,
                Evidence evidence
        ) {}

        public record DetailedScenario(
                List<String> steps,
                String automationEffect
        ) {}

        public record Evidence(
                PaperEvidence paper,
                NewsEvidence news
        ) {}

        public record PaperEvidence(
                String level,
                String note
        ) {}

        public record NewsEvidence(
                Integer count,
                String note
        ) {}
    }
}
