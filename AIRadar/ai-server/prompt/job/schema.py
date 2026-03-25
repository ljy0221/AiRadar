from pydantic import BaseModel
from typing import List

class CoreTaskRequest(BaseModel):
    taskKey: str
    taskTitle: str
    taskDescription: str
    displayOrder: int

class JobForecastRequest(BaseModel):
    jobCode: str
    jobName: str
    forecastMonth: str
    coreTasks: List[CoreTaskRequest]

class EvidencePaper(BaseModel):
    level: str  # "HIGH" | "MEDIUM" | "LOW"
    note: str

class EvidenceNews(BaseModel):
    count: int
    note: str

class Evidence(BaseModel):
    paper: EvidencePaper
    news: EvidenceNews

class DetailedScenario(BaseModel):
    steps: List[str]
    automationEffect: str

class JobForecastTaskResponse(BaseModel):
    taskKey: str
    taskTitle: str
    impactSummary: str
    detailedScenario: DetailedScenario
    humanStrengths: List[str]
    recommendedSkills: List[str]
    promisingTools: List[str]
    evidence: Evidence

class JobForecastResponse(BaseModel):
    modelName: str
    promptVersion: str
    tasks: List[JobForecastTaskResponse]
