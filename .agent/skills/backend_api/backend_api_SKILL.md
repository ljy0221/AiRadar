---
name: backend_api
description: AIRadar Spring Boot 백엔드의 API 엔드포인트, 엔티티 구조, 응답 포맷을 안내합니다. 프론트엔드 API 연동이나 더미 데이터 작성 시 반드시 참고하세요.
---

# AIRadar 백엔드 API 가이드

## 기술 스택
- **Framework**: Spring Boot 3 + Java
- **DB**: PostgreSQL + pgvector (벡터 검색)
- **ORM**: Spring Data JPA
- **빌드**: Gradle

## API 엔드포인트 일람

### 📄 논문 (Arxiv) — `/api/papers`

#### `GET /api/papers` — 목록
쿼리 파라미터:
- `category` (optional): 예) `LLM`, `Agent`, `Vision`
- `researchArea` (optional): 예) `Large Language Models`
- `page`, `size`, `sort` (Pageable)

응답 (`PaperDto.ListItem` Page):
```json
{
  "content": [{
    "paperId": "2403.09611",
    "title": "...",
    "source": "arxiv",
    "authors": ["저자1", "저자2"],
    "researchArea": "Large Language Models",
    "category": "LLM",
    "publishedAt": "2026-03-14T09:22:00"
  }],
  "totalElements": 100,
  "totalPages": 5,
  "size": 20,
  "number": 0
}
```

#### `GET /api/papers/{paperId}` — 상세
응답 (`PaperDto.Detail`):
```json
{
  "paperId": "2403.09611",
  "title": "...",
  "abstractText": "...",
  "url": "https://arxiv.org/abs/2403.09611",
  "source": "arxiv",
  "authors": ["저자1"],
  "researchArea": "Large Language Models",
  "keywords": ["LLM", "MoE", "inference"],
  "summary": "AI 요약 텍스트",
  "category": "LLM",
  "publishedAt": "2026-03-14T09:22:00"
}
```

---

### 📰 뉴스 — `/api/news`

#### `GET /api/news` — 목록
쿼리 파라미터:
- `region` (optional): `GLOBAL` / `DOMESTIC`
- `category` (optional): `AI_MODEL`, `AI_HARDWARE`, `AI_POLICY` 등
- `page`, `size`, `sort` (Pageable)

응답 (`NewsDto.ListItem` Page):
```json
{
  "content": [{
    "articleId": "news-20260315-001",
    "title": "...",
    "source": "TechCrunch",
    "region": "GLOBAL",
    "category": "AI_MODEL",
    "sentiment": "POSITIVE",
    "score": 0.8732,
    "publishedAt": "2026-03-15T08:30:00"
  }]
}
```

#### `GET /api/news/{articleId}` — 상세
응답 (`NewsDto.Detail`):
```json
{
  "articleId": "news-20260315-001",
  "title": "...",
  "content": "본문 전체",
  "url": "https://...",
  "source": "TechCrunch",
  "countryCode": "US",
  "region": "GLOBAL",
  "sentiment": "POSITIVE",
  "keywords": ["OpenAI", "GPT-5"],
  "score": 0.8732,
  "summary": "AI 요약",
  "category": "AI_MODEL",
  "viewCount": 14230,
  "publishedAt": "2026-03-15T08:30:00"
}
```

---

### 📊 대시보드 — `/api/dashboard`
> `TechKeywordDaily`, `TechLifecycle`, `JobAiRisk` 엔티티 기반

주요 응답 필드:
- **TechKeywordDaily**: `keyword`, `statDate`, `sourceType`, `mentionCount`, `searchCount`, `avgSentiment`, `commitCount`
- **TechLifecycle**: `keyword`, `status` (RISING/PEAK/STABLE/DECLINING), `peakDate`, `firstSeenDate`, `trendScore`, `velocity`, `weekOverWeek`, `relatedKeywords`
- **JobAiRisk**: `jobType`, `jobCategory`, `riskLevel` (HIGH/MED/LOW), `riskScore`, `humanStrengths`, `recommendedSkills`, `relatedTools`

---

### 🔍 시맨틱 검색 — `/api/search`
> pgvector 기반 벡터 유사도 검색
- `contentType`: `news` / `paper`
- 결과: `SearchResultDto` (contentId, contentType, similarity 등)

## 공통 규칙
- 모든 응답은 `ResponseEntity<T>` 래핑
- 페이지네이션은 Spring `Pageable` 사용 (`?page=0&size=20&sort=publishedAt,desc`)
- 날짜 포맷: `LocalDateTime` → ISO 8601 (`2026-03-15T08:30:00`)
- `sentiment`: `POSITIVE` / `NEGATIVE` / `NEUTRAL`
- `region`: `GLOBAL` / `DOMESTIC`
