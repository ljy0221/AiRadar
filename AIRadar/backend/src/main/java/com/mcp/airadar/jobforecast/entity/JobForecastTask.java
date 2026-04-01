package com.mcp.airadar.jobforecast.entity;

import com.mcp.airadar.common.converter.StringArrayConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "job_forecast_task")
public class JobForecastTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "forecast_id", nullable = false)
    private JobForecast forecast;

    @Column(name = "task_key", nullable = false, length = 100)
    private String taskKey;

    @Column(name = "task_title", nullable = false, length = 200)
    private String taskTitle;

    @Column(name = "task_description", nullable = false, columnDefinition = "TEXT")
    private String taskDescription;

    @Column(name = "impact_summary", nullable = false, columnDefinition = "TEXT")
    private String impactSummary;

    @Column(name = "workflow_steps_json", nullable = false, columnDefinition = "JSONB")
    private String workflowStepsJson;

    @Column(name = "automation_effect", columnDefinition = "TEXT")
    private String automationEffect;

    @Convert(converter = StringArrayConverter.class)
    @Column(name = "human_strengths", nullable = false, columnDefinition = "TEXT[]")
    private String[] humanStrengths = new String[0];

    @Convert(converter = StringArrayConverter.class)
    @Column(name = "recommended_skills", nullable = false, columnDefinition = "TEXT[]")
    private String[] recommendedSkills = new String[0];

    @Convert(converter = StringArrayConverter.class)
    @Column(name = "promising_tools", nullable = false, columnDefinition = "TEXT[]")
    private String[] promisingTools = new String[0];

    @Column(name = "paper_evidence_level", length = 20)
    private String paperEvidenceLevel;

    @Column(name = "paper_evidence_note", length = 100)
    private String paperEvidenceNote;

    @Column(name = "news_evidence_count", nullable = false)
    private Integer newsEvidenceCount = 0;

    @Column(name = "news_evidence_note", length = 100)
    private String newsEvidenceNote;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder;
}
