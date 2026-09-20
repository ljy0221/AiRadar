# 추천 시스템 흐름

```mermaid
flowchart TD
    subgraph USER["사용자 행동 이벤트"]
        E1["기사 조회<br/>POST /events/article-view<br/>{articleId, dwellTimeSeconds}"]
        E2["검색<br/>POST /events/search<br/>{query}"]
        E3["좋아요 (미구현)<br/>POST /events/article-like"]
        E4["북마크<br/>POST /events/article-bookmark"]
    end

    subgraph ASYNC["비동기 처리 (@Async fire-and-forget)"]
        EVT["EventService<br/>즉시 202 반환"]
    end

    subgraph STORE["상태 저장"]
        SL[("search_logs<br/>PostgreSQL<br/>월별 파티셔닝")]
        RED["Redis<br/>user:{userId}:profile Hash<br/>TTL 30일<br/>─────────────<br/>keyword → weight"]
        TRD["Redis<br/>search:trending Sorted Set<br/>매일 자정 50% 감쇠"]
    end

    subgraph BATCH["배치 추천 생성 (매일 새벽 2시, Airflow: recommendation_batch)"]
        ALS["Spark CollaborativeFilteringJob<br/>ALS 행렬 분해<br/>─────────────────<br/>입력: search_logs 최근 30일<br/>조건: 이벤트 수 ≥ 10건"]
        REC[("user_recommendations<br/>PostgreSQL<br/>TTL 1일 자동 만료")]
        ALS -->|"user_id, article_id, score 저장"| REC
    end

    subgraph SERVE["추천 서빙"]
        API["Spring Boot<br/>RecommendationService"]

        subgraph LOGIC["서빙 우선순위"]
            L1["① Redis 캐시 조회<br/>TTL 30분"]
            L2["② user_recommendations<br/>ALS 배치 결과"]
            L3["③ user_interests<br/>관심 키워드 매칭"]
            L4["④ Cold Start Fallback<br/>트렌딩 콘텐츠"]
            L1 -->|Cache Miss| L2 -->|없음| L3 -->|없음| L4
        end

        TREND["GET /recommendations/trending<br/>Redis search:trending<br/>Sorted Set Top N"]
    end

    subgraph FE["프론트엔드"]
        FEED["개인화 뉴스 피드<br/>GET /recommendations/news"]
        TRENDUI["트렌딩 UI<br/>GET /recommendations/trending"]
    end

    E1 & E2 & E3 & E4 -->|동기 수신| EVT
    E1 -->|"키워드 가중치 반영<br/>(체류 시간 무관)"| RED
    E1 & E3 & E4 -->|event_type 기록| SL
    E2 -->|query 기록| SL
    E2 -->|ZINCRBY| TRD

    SL -->|30일 이내 데이터| ALS
    RED -->|관심 키워드 참조| API
    REC -->|ALS 결과 조회| API
    TRD -->|트렌딩 조회| TREND

    API --- LOGIC
    API -->|"결과 캐시 Redis TTL 30분"| RED
    API --> FEED
    TREND --> TRENDUI
```
