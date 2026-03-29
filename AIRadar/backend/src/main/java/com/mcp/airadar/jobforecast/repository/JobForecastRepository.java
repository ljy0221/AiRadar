package com.mcp.airadar.jobforecast.repository;

import com.mcp.airadar.jobforecast.entity.JobForecast;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface JobForecastRepository extends JpaRepository<JobForecast, Long> {

    @EntityGraph(attributePaths = {"jobRole"})
    Optional<JobForecast> findByJobRoleCodeAndForecastMonth(String jobCode, LocalDate forecastMonth);

    @EntityGraph(attributePaths = {"jobRole"})
    Optional<JobForecast> findTopByJobRoleCodeOrderByForecastMonthDescGeneratedAtDesc(String jobCode);

    List<JobForecast> findAllByForecastMonth(LocalDate forecastMonth);
}
