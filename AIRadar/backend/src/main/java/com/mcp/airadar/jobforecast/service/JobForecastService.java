package com.mcp.airadar.jobforecast.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mcp.airadar.dashboard.repository.TechKeywordDailyRepository;
import com.mcp.airadar.config.RedisCacheConfig;
import com.mcp.airadar.jobforecast.dto.JobForecastGenerationResultDto;
import com.mcp.airadar.jobforecast.dto.JobForecastResponse;
import com.mcp.airadar.jobforecast.entity.JobForecast;
import com.mcp.airadar.jobforecast.entity.JobForecastTask;
import com.mcp.airadar.jobforecast.entity.JobRole;
import com.mcp.airadar.jobforecast.entity.JobRoleCoreTask;
import com.mcp.airadar.jobforecast.entity.JobRoleType;
import com.mcp.airadar.jobforecast.repository.JobForecastRepository;
import com.mcp.airadar.jobforecast.repository.JobRoleRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Service
public class JobForecastService {

    private final JobRoleRepository jobRoleRepository;
    private final JobForecastRepository jobForecastRepository;
    private final TechKeywordDailyRepository techKeywordDailyRepository;
    private final JobForecastAiClient jobForecastAiClient;
    private final ObjectMapper objectMapper;

    public JobForecastService(
            JobRoleRepository jobRoleRepository,
            JobForecastRepository jobForecastRepository,
            TechKeywordDailyRepository techKeywordDailyRepository,
            JobForecastAiClient jobForecastAiClient,
            ObjectMapper objectMapper
    ) {
        this.jobRoleRepository = jobRoleRepository;
        this.jobForecastRepository = jobForecastRepository;
        this.techKeywordDailyRepository = techKeywordDailyRepository;
        this.jobForecastAiClient = jobForecastAiClient;
        this.objectMapper = objectMapper;
    }

    @Transactional
    @Cacheable(
            cacheNames = RedisCacheConfig.JOB_FORECAST_CURRENT_CACHE,
            key = "#jobCode + ':' + T(java.time.YearMonth).now().toString()"
    )
    public JobForecastResponse getCurrentForecast(String jobCode) {
        LocalDate forecastMonth = YearMonth.now().atDay(1);
        return getOrGenerateForecast(jobCode, forecastMonth);
    }

    @Transactional
    @CacheEvict(cacheNames = RedisCacheConfig.JOB_FORECAST_CURRENT_CACHE, allEntries = true)
    public JobForecastResponse regenerateForecast(String jobCode, YearMonth yearMonth) {
        return generateAndSaveForecast(getActiveJobRole(jobCode), yearMonth.atDay(1), false);
    }

    @Transactional
    @CacheEvict(cacheNames = RedisCacheConfig.JOB_FORECAST_CURRENT_CACHE, allEntries = true)
    public JobForecastGenerationResultDto generateMonthlyForecasts(YearMonth yearMonth, boolean forceRegenerate) {
        LocalDate forecastMonth = yearMonth.atDay(1);
        List<String> generated = new ArrayList<>();
        List<String> skipped = new ArrayList<>();
        List<String> failed = new ArrayList<>();

        for (JobRole role : jobRoleRepository.findAllByActiveTrueOrderByIdAsc()) {
            try {
                if (!forceRegenerate &&
                        jobForecastRepository.findByJobRoleCodeAndForecastMonth(role.getCode(), forecastMonth).isPresent()) {
                    skipped.add(role.getCode());
                    continue;
                }
                generateAndSaveForecast(role, forecastMonth, false);
                generated.add(role.getCode());
            } catch (Exception ex) {
                failed.add(role.getCode());
            }
        }

        return new JobForecastGenerationResultDto(
                forecastMonth,
                generated.size(),
                skipped.size(),
                failed.size(),
                generated,
                skipped,
                failed
        );
    }

    private JobForecastResponse getOrGenerateForecast(String jobCode, LocalDate forecastMonth) {
        JobForecast current = jobForecastRepository.findByJobRoleCodeAndForecastMonth(jobCode, forecastMonth).orElse(null);
        if (current != null) {
            return toResponse(current, false);
        }

        JobRole role = getActiveJobRole(jobCode);
        try {
            return generateAndSaveForecast(role, forecastMonth, false);
        } catch (Exception ex) {
            JobForecast fallback = jobForecastRepository.findTopByJobRoleCodeOrderByForecastMonthDescGeneratedAtDesc(jobCode)
                    .orElseThrow(() -> new IllegalStateException("No fallback forecast available for job: " + jobCode, ex));
            return toResponse(fallback, true);
        }
    }

    private JobRole getActiveJobRole(String jobCode) {
        JobRoleType roleType = JobRoleType.fromCode(jobCode);
        return jobRoleRepository.findByCodeAndActiveTrue(jobCode)
                .orElseThrow(() -> new EntityNotFoundException("Job role not found: " + roleType.getCode()));
    }

    private JobForecastResponse generateAndSaveForecast(JobRole role, LocalDate forecastMonth, boolean stale) {
        if (role.getCoreTasks() == null || role.getCoreTasks().isEmpty()) {
            throw new IllegalStateException("No core tasks configured for job role: " + role.getCode());
        }

        List<String> newsKeywords = getMonthlyTopKeywords("NEWS", forecastMonth, 8);
        List<String> paperKeywords = getMonthlyTopKeywords("PAPER", forecastMonth, 8);

        JobForecastAiClient.GenerateJobForecastRequest request =
                new JobForecastAiClient.GenerateJobForecastRequest(
                        role.getCode(),
                        role.getName(),
                        forecastMonth,
                        newsKeywords,
                        paperKeywords,
                        role.getCoreTasks().stream()
                                .map(task -> new JobForecastAiClient.GenerateJobForecastRequest.CoreTaskInput(
                                        task.getTaskKey(),
                                        task.getTaskTitle(),
                                        task.getTaskDescription(),
                                        task.getDisplayOrder()
                                ))
                                .toList()
                );

        JobForecastAiClient.GenerateJobForecastResponse aiResponse = jobForecastAiClient.generate(request);

        JobForecast forecast = jobForecastRepository.findByJobRoleCodeAndForecastMonth(role.getCode(), forecastMonth)
                .orElseGet(JobForecast::new);

        forecast.setJobRole(role);
        forecast.setForecastMonth(forecastMonth);
        forecast.setGeneratedAt(LocalDateTime.now());
        forecast.setExpiresAt(forecastMonth.plusMonths(1).atStartOfDay());
        forecast.setModelName(aiResponse.modelName());
        forecast.setPromptVersion(aiResponse.promptVersion());
        forecast.setRawResponseJson(writeJson(aiResponse));
        forecast.getTasks().clear();

        for (JobRoleCoreTask coreTask : role.getCoreTasks()) {
            JobForecastAiClient.GenerateJobForecastResponse.TaskResult result = aiResponse.tasks().stream()
                    .filter(task -> coreTask.getTaskKey().equals(task.taskKey()))
                    .findFirst()
                    .orElseThrow(() -> new IllegalStateException(
                            "AI response missing task result for key: " + coreTask.getTaskKey()));

            JobForecastTask taskEntity = new JobForecastTask();
            taskEntity.setForecast(forecast);
            taskEntity.setTaskKey(coreTask.getTaskKey());
            taskEntity.setTaskTitle(coreTask.getTaskTitle());
            taskEntity.setTaskDescription(coreTask.getTaskDescription());
            taskEntity.setImpactSummary(result.impactSummary());
            taskEntity.setWorkflowStepsJson(writeJson(result.detailedScenario() == null ? List.of() : result.detailedScenario().steps()));
            taskEntity.setAutomationEffect(result.detailedScenario() == null ? null : result.detailedScenario().automationEffect());
            taskEntity.setHumanStrengths(toArray(result.humanStrengths()));
            taskEntity.setRecommendedSkills(toArray(result.recommendedSkills()));
            taskEntity.setPromisingTools(toArray(result.promisingTools()));
            taskEntity.setPaperEvidenceLevel(result.evidence() == null || result.evidence().paper() == null
                    ? null : result.evidence().paper().level());
            taskEntity.setPaperEvidenceNote(result.evidence() == null || result.evidence().paper() == null
                    ? null : result.evidence().paper().note());
            taskEntity.setNewsEvidenceCount(result.evidence() == null || result.evidence().news() == null
                    ? 0 : defaultInt(result.evidence().news().count()));
            taskEntity.setNewsEvidenceNote(result.evidence() == null || result.evidence().news() == null
                    ? null : result.evidence().news().note());
            taskEntity.setDisplayOrder(coreTask.getDisplayOrder());
            forecast.getTasks().add(taskEntity);
        }

        JobForecast saved = jobForecastRepository.save(forecast);
        return toResponse(saved, stale);
    }

    private JobForecastResponse toResponse(JobForecast forecast, boolean stale) {
        return new JobForecastResponse(
                forecast.getJobRole().getCode(),
                forecast.getJobRole().getName(),
                forecast.getForecastMonth(),
                forecast.getGeneratedAt(),
                forecast.getExpiresAt(),
                stale,
                forecast.getModelName(),
                forecast.getPromptVersion(),
                readKeywordInsight(forecast.getRawResponseJson()),
                forecast.getTasks().stream()
                        .map(task -> new JobForecastResponse.TaskForecast(
                                task.getTaskKey(),
                                task.getTaskTitle(),
                                task.getTaskDescription(),
                                task.getImpactSummary(),
                                new JobForecastResponse.DetailedScenario(
                                        readSteps(task.getWorkflowStepsJson()),
                                        task.getAutomationEffect()
                                ),
                                toList(task.getHumanStrengths()),
                                toList(task.getRecommendedSkills()),
                                toList(task.getPromisingTools()),
                                new JobForecastResponse.Evidence(
                                        new JobForecastResponse.PaperEvidence(
                                                task.getPaperEvidenceLevel(),
                                                task.getPaperEvidenceNote()
                                        ),
                                        new JobForecastResponse.NewsEvidence(
                                                task.getNewsEvidenceCount(),
                                                task.getNewsEvidenceNote()
                                        )
                                )
                        ))
                        .toList()
        );
    }

    private List<String> getMonthlyTopKeywords(String sourceType, LocalDate forecastMonth, int limit) {
        LocalDate startDate = forecastMonth.minusMonths(1);
        LocalDate endDate = forecastMonth.minusDays(1);
        return techKeywordDailyRepository.findTopKeywordsByDateRangeAndSourceType(sourceType, startDate, endDate, limit)
                .stream()
                .map(row -> row[0] == null ? null : String.valueOf(row[0]))
                .filter(keyword -> keyword != null && !keyword.isBlank())
                .toList();
    }

    private JobForecastResponse.KeywordInsight readKeywordInsight(String rawResponseJson) {
        if (rawResponseJson == null || rawResponseJson.isBlank()) {
            return null;
        }
        try {
            JsonNode root = objectMapper.readTree(rawResponseJson);
            JsonNode keywordInsight = root.get("keywordInsight");
            if (keywordInsight == null || keywordInsight.isNull()) {
                return null;
            }
            List<String> newsKeywords = readTextArray(keywordInsight.get("newsKeywords"));
            List<String> paperKeywords = readTextArray(keywordInsight.get("paperKeywords"));
            String summary = keywordInsight.hasNonNull("summary") ? keywordInsight.get("summary").asText() : "";
            return new JobForecastResponse.KeywordInsight(newsKeywords, paperKeywords, summary);
        } catch (Exception e) {
            return null;
        }
    }

    private List<String> readTextArray(JsonNode node) {
        if (node == null || !node.isArray()) {
            return List.of();
        }
        List<String> values = new ArrayList<>();
        for (JsonNode item : node) {
            if (item != null && !item.isNull()) {
                String value = item.asText();
                if (value != null && !value.isBlank()) {
                    values.add(value);
                }
            }
        }
        return values;
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize JSON.", e);
        }
    }

    private List<String> readSteps(String json) {
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("Failed to deserialize workflow steps JSON.", e);
        }
    }

    private String[] toArray(List<String> values) {
        return values == null ? new String[0] : values.toArray(new String[0]);
    }

    private List<String> toList(String[] values) {
        return values == null ? List.of() : Arrays.stream(values).toList();
    }

    private Integer defaultInt(Integer value) {
        return value == null ? 0 : value;
    }
}
