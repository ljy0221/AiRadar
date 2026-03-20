# AiRadar Database ERD

```mermaid
erDiagram
    news_items {
        VARCHAR(255) article_id PK
        TEXT title
        TEXT content
        VARCHAR(1000) url
        VARCHAR(100) source
        CHAR(2) country_code
        VARCHAR(10) region
        VARCHAR(20) sentiment
        TEXT[] keywords
        DECIMAL(5_4) score
        TEXT summary
        VARCHAR(50) category
        BIGINT view_count
        TIMESTAMP published_at
        TIMESTAMP analyzed_at
        TIMESTAMP created_at
        TIMESTAMP updated_at
        BOOLEAN is_active
    }

    papers {
        VARCHAR(255) paper_id PK
        TEXT title
        TEXT abstract
        VARCHAR(1000) url
        VARCHAR(50) source
        TEXT[] authors
        VARCHAR(100) research_area
        TEXT[] keywords
        TEXT summary
        VARCHAR(50) category
        TIMESTAMP published_at
        TIMESTAMP analyzed_at
        TIMESTAMP created_at
        TIMESTAMP updated_at
        BOOLEAN is_active
    }

    github_repos {
        VARCHAR(255) repo_id PK
        VARCHAR(500) repo_name
        TEXT description
        VARCHAR(100) language
        TEXT[] topics
        BIGINT stars
        BIGINT forks
        INT open_issues
        INT weekly_commits
        INT star_delta_7d
        BOOLEAN ai_relevance
        TEXT[] keywords
        DATE snapshot_date
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    content_embeddings {
        VARCHAR(255) content_id PK
        VARCHAR(20) content_type
        vector(768) embedding
        TIMESTAMP created_at
        TIMESTAMP updated_at
    }

    company_news_timeline {
        BIGSERIAL id PK
        VARCHAR(200) company_name
        VARCHAR(255) article_id FK
        TIMESTAMP published_at
    }

    tech_keyword_daily {
        BIGSERIAL id PK
        VARCHAR(200) keyword
        DATE stat_date
        VARCHAR(20) source_type
        INT mention_count
        INT search_count
        DECIMAL(4_3) avg_sentiment
        INT commit_count
        TIMESTAMP created_at
    }

    tech_lifecycle {
        VARCHAR(200) keyword PK
        VARCHAR(20) status
        DATE peak_date
        DATE first_seen_date
        DECIMAL(8_4) trend_score
        DECIMAL(8_4) velocity
        DECIMAL(6_3) week_over_week
        TEXT[] related_keywords
        TIMESTAMP updated_at
    }

    tech_commercialization {
        VARCHAR(200) tech_name PK
        VARCHAR(50) category
        DATE first_paper_date
        DATE paper_peak_date
        INT paper_count
        DATE first_product_date
        INT product_count
        INT days_to_market
        VARCHAR(30) commercialization_stage
        TIMESTAMP updated_at
    }

    job_ai_risk {
        VARCHAR(200) job_type PK
        VARCHAR(100) job_category
        VARCHAR(10) risk_level
        DECIMAL(4_2) risk_score
        TEXT[] human_strengths
        TEXT[] recommended_skills
        JSONB scenarios
        TEXT[] related_tools
        INT source_article_count
        TIMESTAMP updated_at
    }

    country_ai_stats {
        BIGSERIAL id PK
        CHAR(2) country_code
        VARCHAR(100) country_name
        DATE stat_date
        INT news_volume
        DECIMAL(4_3) avg_sentiment
        INT github_contributions
        DECIMAL(6_3) ai_activity_score
        TIMESTAMP created_at
    }

    news_items_staging {
        VARCHAR(255) article_id
        TEXT title
        TEXT content
        VARCHAR(1000) url
        VARCHAR(100) source
        VARCHAR(50) published_at
        VARCHAR(20) sentiment
        TEXT[] keywords
        DECIMAL(5_4) score
        TEXT summary
        VARCHAR(50) category
        VARCHAR(10) region
        TEXT[] companies
        TEXT error_log
        DATE batch_date
    }

    papers_staging {
        VARCHAR(255) paper_id
        TEXT title
        TEXT abstract
        VARCHAR(1000) url
        VARCHAR(50) source
        TEXT[] authors
        VARCHAR(50) published_at
        TEXT[] keywords
        TEXT summary
        VARCHAR(50) category
        VARCHAR(100) research_area
        TEXT error_log
        DATE batch_date
    }

    github_repos_staging {
        VARCHAR(255) repo_id
        VARCHAR(500) repo_name
        TEXT description
        VARCHAR(100) language
        TEXT[] topics
        BIGINT stars
        BIGINT forks
        INT open_issues
        INT weekly_commits
        INT star_delta_7d
        BOOLEAN ai_relevance
        TEXT[] keywords
        TEXT error_log
        DATE batch_date
    }

    %% 논리적 관계 (FK 없음, 참조 관계)
    news_items ||--o{ company_news_timeline : "article_id 참조"
    news_items ||--o| content_embeddings : "content_id=article_id"
    papers ||--o| content_embeddings : "content_id=paper_id"
    github_repos ||--o| content_embeddings : "content_id=repo_id"
    news_items_staging ||--o{ news_items : "upsert to"
    papers_staging ||--o{ papers : "upsert to"
    github_repos_staging ||--o{ github_repos : "upsert to"
```

## 테이블 분류

| 그룹 | 테이블 |
|------|--------|
| **Gold (서빙)** | `news_items`, `papers`, `github_repos` |
| **집계/분석** | `tech_keyword_daily`, `tech_lifecycle`, `tech_commercialization`, `job_ai_risk`, `country_ai_stats`, `company_news_timeline` |
| **벡터 검색** | `content_embeddings` (pgvector 768차원) |
| **스테이징** | `news_items_staging`, `papers_staging`, `github_repos_staging` |
| **뷰** | `tech_contents_view` (Materialized View, news + papers 통합) |

> 외래키(FK)는 파이프라인 유연성을 위해 의도적으로 정의하지 않았습니다. 위 관계는 논리적 참조 관계입니다.
