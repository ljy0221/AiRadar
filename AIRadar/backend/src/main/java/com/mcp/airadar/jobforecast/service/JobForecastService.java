package com.mcp.airadar.jobforecast.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mcp.airadar.jobforecast.dto.JobForecastGenerationResultDto;
import com.mcp.airadar.jobforecast.dto.JobForecastResponse;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

@Service
@RequiredArgsConstructor
public class JobForecastService {

    private static final Logger log = LoggerFactory.getLogger(JobForecastService.class);
    private static final String JOB_FORECAST_CACHE_KEY = "job:forecast:current:%s";

    private final JobForecastTransactionalService jobForecastTransactionalService;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    @Value("${job-forecast.cache.ttl:PT24H}")
    private Duration jobForecastCacheTtl;

    public JobForecastResponse getCurrentForecast(String jobCode) {
        JobForecastResponse cached = getCachedCurrentForecast(jobCode);
        if (cached != null) {
            return cached;
        }

        JobForecastResponse response = jobForecastTransactionalService.getOrGenerateCurrentForecast(jobCode);
        cacheCurrentForecast(jobCode, response);
        return response;
    }

    public JobForecastResponse regenerateForecast(String jobCode, YearMonth yearMonth) {
        JobForecastResponse response = jobForecastTransactionalService.regenerateForecast(jobCode, yearMonth);
        syncCurrentForecastCache(jobCode, yearMonth.atDay(1), response);
        return response;
    }

    public JobForecastGenerationResultDto generateMonthlyForecasts(YearMonth yearMonth, boolean forceRegenerate) {
        JobForecastGenerationResultDto result =
                jobForecastTransactionalService.generateMonthlyForecasts(yearMonth, forceRegenerate);
        syncMonthlyForecastCaches(yearMonth.atDay(1), result.generatedJobs());
        return result;
    }

    private JobForecastResponse getCachedCurrentForecast(String jobCode) {
        String json = redisTemplate.opsForValue().get(cacheKey(jobCode));
        if (json == null || json.isBlank()) {
            return null;
        }

        try {
            return objectMapper.readValue(json, JobForecastResponse.class);
        } catch (Exception e) {
            log.warn("Invalid job forecast cache entry for {}. Removing stale cache.", jobCode);
            evictCurrentForecast(jobCode);
            return null;
        }
    }

    private void cacheCurrentForecast(String jobCode, JobForecastResponse response) {
        if (response == null || response.stale()) {
            return;
        }

        try {
            redisTemplate.opsForValue().set(
                    cacheKey(jobCode),
                    objectMapper.writeValueAsString(response),
                    jobForecastCacheTtl
            );
        } catch (Exception e) {
            log.warn("Failed to cache current job forecast for {}.", jobCode);
        }
    }

    private void syncCurrentForecastCache(String jobCode, LocalDate forecastMonth, JobForecastResponse response) {
        if (YearMonth.from(forecastMonth).equals(YearMonth.now())) {
            cacheCurrentForecast(jobCode, response);
        }
    }

    private void syncMonthlyForecastCaches(LocalDate forecastMonth, List<String> generatedJobCodes) {
        if (!YearMonth.from(forecastMonth).equals(YearMonth.now())) {
            return;
        }

        for (String jobCode : generatedJobCodes) {
            JobForecastResponse response = jobForecastTransactionalService.findCurrentForecast(jobCode);
            cacheCurrentForecast(jobCode, response);
        }
    }

    private void evictCurrentForecast(String jobCode) {
        redisTemplate.delete(cacheKey(jobCode));
    }

    private String cacheKey(String jobCode) {
        return JOB_FORECAST_CACHE_KEY.formatted(jobCode);
    }
}
