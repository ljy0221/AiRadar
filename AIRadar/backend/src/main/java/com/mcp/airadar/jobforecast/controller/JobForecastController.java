package com.mcp.airadar.jobforecast.controller;

import com.mcp.airadar.jobforecast.dto.JobForecastResponse;
import com.mcp.airadar.jobforecast.dto.JobRoleCatalogDto;
import com.mcp.airadar.jobforecast.service.JobForecastService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/dashboard/jobs")
public class JobForecastController {

    private final JobForecastService jobForecastService;

    public JobForecastController(JobForecastService jobForecastService) {
        this.jobForecastService = jobForecastService;
    }

    @GetMapping
    public ResponseEntity<List<JobRoleCatalogDto>> getJobCatalog() {
        return ResponseEntity.ok(jobForecastService.getJobCatalog());
    }

    @GetMapping("/{jobCode}")
    public ResponseEntity<JobForecastResponse> getCurrentForecast(@PathVariable String jobCode) {
        return ResponseEntity.ok(jobForecastService.getCurrentForecast(jobCode));
    }
}
