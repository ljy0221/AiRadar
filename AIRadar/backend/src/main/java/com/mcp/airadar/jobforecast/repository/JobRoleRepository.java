package com.mcp.airadar.jobforecast.repository;

import com.mcp.airadar.jobforecast.entity.JobRole;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface JobRoleRepository extends JpaRepository<JobRole, Long> {

    Optional<JobRole> findByCodeAndActiveTrue(String code);

    List<JobRole> findAllByActiveTrueOrderByIdAsc();
}
