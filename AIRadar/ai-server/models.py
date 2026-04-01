from pydantic import BaseModel
from typing import Literal


class NewsRequest(BaseModel):
    article_id: str
    title: str
    content: str
    source: str
    published_at: str


class NewsResponse(BaseModel):
    article_id: str
    sentiment: Literal["POSITIVE", "NEGATIVE", "NEUTRAL"]
    keywords: list[str]
    score: float
    summary: str
    category: str
    region: Literal["DOMESTIC", "GLOBAL"]
    companies: list[str] = []


class PaperRequest(BaseModel):
    paper_id: str
    title: str
    abstract: str
    authors: list[str]
    published_at: str


class PaperResponse(BaseModel):
    paper_id: str
    keywords: list[str]
    summary: str
    category: str
    research_area: str


class EmbedRequest(BaseModel):
    text: str


class EmbedResponse(BaseModel):
    embedding: list[float]


class EmbedBatchRequest(BaseModel):
    texts: list[str]


class EmbedBatchResponse(BaseModel):
    embeddings: list[list[float]]
