package com.mcp.airadar.jobforecast.controller;

import com.mcp.airadar.jobforecast.dto.JobForecastGenerationResultDto;
import com.mcp.airadar.jobforecast.dto.JobForecastResponse;
import com.mcp.airadar.jobforecast.service.JobForecastService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.YearMonth;

@RestController
@RequestMapping("/api/v1/admin/job-forecasts")
public class AdminJobForecastController {

    private final JobForecastService jobForecastService;

    public AdminJobForecastController(JobForecastService jobForecastService) {
        this.jobForecastService = jobForecastService;
    }

    @PostMapping("/generate-monthly")
    public ResponseEntity<JobForecastGenerationResultDto> generateMonthly(
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM") YearMonth month,
            @RequestParam(defaultValue = "false") boolean force
    ) {
        YearMonth targetMonth = month == null ? YearMonth.now() : month;
        return ResponseEntity.ok(jobForecastService.generateMonthlyForecasts(targetMonth, force));
    }

    @PostMapping("/{jobCode}/regenerate")
    public ResponseEntity<JobForecastResponse> regenerateForecast(
            @PathVariable String jobCode,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM") YearMonth month
    ) {
        YearMonth targetMonth = month == null ? YearMonth.now() : month;
        return ResponseEntity.ok(jobForecastService.regenerateForecast(jobCode, targetMonth));
    }
}
