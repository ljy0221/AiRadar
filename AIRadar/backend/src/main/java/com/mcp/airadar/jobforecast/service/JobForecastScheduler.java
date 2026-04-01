package com.mcp.airadar.jobforecast.service;

import lombok.extern.log4j.Log4j2;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.YearMonth;

@Log4j2
@Component
public class JobForecastScheduler {

    private final JobForecastService jobForecastService;
    private final boolean schedulerEnabled;

    public JobForecastScheduler(
            JobForecastService jobForecastService,
            @Value("${job-forecast.scheduler.enabled:false}") boolean schedulerEnabled
    ) {
        this.jobForecastService = jobForecastService;
        this.schedulerEnabled = schedulerEnabled;
    }

    @Scheduled(cron = "${job-forecast.scheduler.cron:0 10 0 1 * *}", zone = "${job-forecast.scheduler.zone:Asia/Seoul}")
    public void generateMonthlyForecasts() {
        if (!schedulerEnabled) {
            return;
        }

        YearMonth currentMonth = YearMonth.now();
        log.info("[JobForecastScheduler] Starting monthly generation for {}", currentMonth);
        jobForecastService.generateMonthlyForecasts(currentMonth, false);
    }
}
