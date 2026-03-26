from pydantic import BaseModel, Field
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
    newsKeywords: List[str] = Field(default_factory=list)
    paperKeywords: List[str] = Field(default_factory=list)
    coreTasks: List[CoreTaskRequest]


class KeywordInsight(BaseModel):
    newsKeywords: List[str]
    paperKeywords: List[str]
    summary: str

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
    keywordInsight: KeywordInsight
    tasks: List[JobForecastTaskResponse]
