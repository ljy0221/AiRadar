package com.mcp.airadar.dashboard.entity;

import com.mcp.airadar.common.converter.StringArrayConverter;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "job_ai_risk")
public class JobAiRisk {

    @Id
    @Column(name = "job_type", length = 200)
    private String jobType;

    @Column(name = "job_category", length = 100)
    private String jobCategory;

    @Column(name = "risk_level", length = 10)
    private String riskLevel;

    @Column(name = "risk_score", precision = 4, scale = 2)
    private BigDecimal riskScore;

    @Convert(converter = StringArrayConverter.class)
    @Column(name = "human_strengths", columnDefinition = "TEXT[]")
    private String[] humanStrengths;

    @Convert(converter = StringArrayConverter.class)
    @Column(name = "recommended_skills", columnDefinition = "TEXT[]")
    private String[] recommendedSkills;

    @Column(name = "scenarios", columnDefinition = "JSONB")
    private String scenarios;

    @Convert(converter = StringArrayConverter.class)
    @Column(name = "related_tools", columnDefinition = "TEXT[]")
    private String[] relatedTools;

    @Column(name = "source_article_count")
    private Integer sourceArticleCount = 0;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public String getJobType() { return jobType; }
    public String getJobCategory() { return jobCategory; }
    public String getRiskLevel() { return riskLevel; }
    public BigDecimal getRiskScore() { return riskScore; }
    public String[] getHumanStrengths() { return humanStrengths; }
    public String[] getRecommendedSkills() { return recommendedSkills; }
    public String getScenarios() { return scenarios; }
    public String[] getRelatedTools() { return relatedTools; }
    public Integer getSourceArticleCount() { return sourceArticleCount; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}
