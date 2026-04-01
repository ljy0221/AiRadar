package com.mcp.airadar.dashboard.dto;

import com.mcp.airadar.dashboard.entity.JobAiRisk;

import java.math.BigDecimal;

public record JobRiskDto(
        String jobType,
        String jobCategory,
        String riskLevel,
        BigDecimal riskScore,
        String[] humanStrengths,
        String[] recommendedSkills,
        String[] relatedTools
) {
    public static JobRiskDto from(JobAiRisk e) {
        return new JobRiskDto(
                e.getJobType(),
                e.getJobCategory(),
                e.getRiskLevel(),
                e.getRiskScore(),
                e.getHumanStrengths(),
                e.getRecommendedSkills(),
                e.getRelatedTools()
        );
    }
}
