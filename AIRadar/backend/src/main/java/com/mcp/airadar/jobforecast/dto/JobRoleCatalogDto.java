package com.mcp.airadar.jobforecast.dto;

import java.util.List;

public record JobRoleCatalogDto(
        String jobCode,
        String jobName,
        List<CoreTask> coreTasks
) {
    public record CoreTask(
            String taskKey,
            String taskTitle,
            String taskDescription,
            Integer displayOrder
    ) {}
}
