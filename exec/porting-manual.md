# AIRadar 포팅 매뉴얼

> **팀명**: B104 | **프로젝트명**: AIRadar — 실시간 AI 기술 인텔리전스 플랫폼

---

## 목차

1. [빌드 및 배포 문서](#1-빌드-및-배포-문서)
2. [외부 서비스 정보](#2-외부-서비스-정보)
3. [DB 덤프 파일](#3-db-덤프-파일)
4. [시연 시나리오](#4-시연-시나리오)

---

## 1. 빌드 및 배포 문서

### 1-1. 기술 스택 및 버전

| 구분 | 제품 | 버전 |
|------|------|------|
| **JVM** | OpenJDK | 17 (Eclipse Temurin 17) |
| **WAS/웹서버** | Spring Boot Embedded Tomcat | 3.3.5 |
| **백엔드 프레임워크** | Spring Boot | 3.3.5 |
| **데이터 처리** | Apache Spark | 3.5.0 (Scala 2.12) |
| **데이터 레이크** | Delta Lake | 3.1.0 |
| **메시지 브로커** | Apache Kafka (Confluent) | 7.4.0 |
| **관계형 DB** | PostgreSQL + pgvector | 16 |
| **캐시** | Redis | 7-alpine |
| **오브젝트 스토리지** | AWS S3 (운영) | — |
| **워크플로우** | Apache Airflow | 2.8.3 |
| **AI 서버** | Python FastAPI + Uvicorn | 0.115.0 + 0.32.0 |
| **AI LLM** | Claude Haiku (GMS 프록시) | claude-haiku-4-5-20251001 |
| **임베딩 모델** | paraphrase-multilingual-mpnet-base-v2 | HuggingFace |
| **프론트엔드** | Next.js + React + TypeScript | 16.1.6 + 19.2.3 + 5 |
| **컨테이너** | Docker + Docker Compose | 24+ / 2.x |
| **CI/CD** | Jenkins | 2.x |
| **IDE (개발)** | IntelliJ IDEA, VSCode | 권장 최신 버전 |
| **빌드 도구 (백엔드)** | Gradle + Shadow Plugin | 8.x + 8.1.1 |
| **빌드 도구 (프론트)** | npm | 18+ 필요 |
| **인프라 OS** | Ubuntu 22.04 LTS | — |

---

### 1-2. 멀티 서버 구성

운영 환경은 두 서버로 분리되어 있습니다.

| 서버 | IP | 역할 | 주요 서비스 |
|------|-----|------|------------|
| **Server1** | 172.26.3.32 (내부) | 데이터 처리 | Kafka, Zookeeper, Spark Master/Worker1, Airflow, Jenkins, Crawling Server |
| **Server2** | 172.26.5.50 (내부) | 서빙 | PostgreSQL, Redis, AI Server, Spring Boot Backend, Next.js Frontend, Spark Worker2 |

공개 접속 도메인: `j14b104a.p.ssafy.io`

---

### 1-3. 서비스 포트 정보

#### 로컬 개발 환경

| 서비스 | 포트 |
|--------|------|
| Spring Boot Backend | 8888 |
| Next.js Frontend | 3000 |
| Kafka | 9092 (내부), 29092 (외부) |
| PostgreSQL | 5432 |
| Redis | 6379 |
| Spark Master UI | 8080 |
| Spark App UI | 4040 |
| Airflow | 8081 |
| AI Server | 8000 |
| Crawling Server | 8002 |

#### 운영 환경 (Server1)

| 서비스 | 포트 |
|--------|------|
| Kafka (외부) | 29092 |
| Spark Master | 17077 |
| Spark Master UI | 18080 |
| Airflow | 18081 |
| Jenkins | 18083 |
| Crawling Server | 18002 |

#### 운영 환경 (Server2)

| 서비스 | 포트 |
|--------|------|
| Spring Boot Backend | 18888 |
| Next.js Frontend | 13000 |
| PostgreSQL | 15432 |
| Redis | 16379 |
| AI Server | 18000 |
| Kafka UI | 18090 |
| PgAdmin | 18050 |
| Redis Insight | 18001 |

---

### 1-4. 환경 변수 상세

#### 로컬 개발 (`AIRadar/infra/.env`)

```bash
# AIRadar/infra/.env.example 복사 후 수정
cp AIRadar/infra/.env.example AIRadar/infra/.env
```

| 변수명 | 설명 | 기본값/예시 |
|--------|------|------------|
| `POSTGRES_DB` | DB 이름 | airadar |
| `POSTGRES_USER` | DB 사용자 | airadar |
| `POSTGRES_PASSWORD` | DB 비밀번호 | airadar_secret |
| `AIRFLOW_DB_USER` | Airflow 메타DB 사용자 | airflow_user |
| `AIRFLOW_DB_PASSWORD` | Airflow 메타DB 비밀번호 | airflow_secret |
| `GMS_KEY` | **SSAFY GMS 프록시 키 (필수)** | your-gms-key-here |
| `AI_BATCH_SIZE` | AI 배치 처리 크기 | 10 |
| `AIRFLOW_ADMIN_USERNAME` | Airflow 관리자 계정 | admin |
| `AIRFLOW_ADMIN_PASSWORD` | Airflow 관리자 비밀번호 | 변경 필수 |

#### 운영 Server1 (`AIRadar/infra/.env.server1`)

```bash
cp AIRadar/infra/.env.server1.example AIRadar/infra/.env.server1
```

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `SERVER1_PUBLIC_HOST` | Server1 공개 도메인 | j14b104.p.ssafy.io |
| `SERVER2_PRIVATE_HOST` | Server2 내부 IP | 172.26.5.50 |
| `SERVER2_POSTGRES_PORT` | Server2 PostgreSQL 포트 | 15432 |
| `SERVER2_REDIS_PORT` | Server2 Redis 포트 | 16379 |
| `AI_SERVER_URL` | AI 서버 URL | http://172.26.5.50:18000 |
| `POSTGRES_PASSWORD` | DB 비밀번호 | **변경 필수** |
| `AIRFLOW_DB_PASSWORD` | Airflow 메타DB 비밀번호 | **변경 필수** |
| `AIRFLOW_ADMIN_PASSWORD` | Airflow 관리자 비밀번호 | **변경 필수** |
| `SPARK_WORKER_CORES` | Spark 워커 코어 수 | 2 |
| `SPARK_WORKER_MEMORY` | Spark 워커 메모리 | 4g |
| `CRAWLER_KAFKA_TOPIC_PREFIX` | Kafka 토픽 접두사 | airader.raw |
| `CRAWLER_TIMEOUT_SEC` | 크롤러 타임아웃(초) | 60 |
| `GITHUB_TOKEN` | GitHub API 토큰 (선택) | — |
| `BRONZE_BASE_PATH` | Bronze Delta Lake 경로 | s3a://airadar-delta/bronze |
| `SILVER_BASE_PATH` | Silver Delta Lake 경로 | s3a://airadar-delta/silver |
| `AWS_ACCESS_KEY_ID` | AWS S3 접근 키 | **변경 필수** |
| `AWS_SECRET_ACCESS_KEY` | AWS S3 비밀 키 | **변경 필수** |

#### 운영 Server2 (`AIRadar/infra/.env.server2`)

```bash
cp AIRadar/infra/.env.server2.example AIRadar/infra/.env.server2
```

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `SERVER1_PRIVATE_HOST` | Server1 내부 IP | 172.26.3.32 |
| `SERVER1_SPARK_MASTER_PORT` | Spark Master 포트 | 17077 |
| `SERVER1_KAFKA_EXTERNAL_PORT` | Kafka 외부 포트 | 29092 |
| `SPRING_PROFILES_ACTIVE` | Spring 프로파일 | prod |
| `NEXT_PUBLIC_API_BASE_URL` | Frontend → Backend URL | http://j14b104a.p.ssafy.io:18888 |
| `POSTGRES_PASSWORD` | DB 비밀번호 | **변경 필수** |
| `GMS_KEY` | SSAFY GMS 프록시 키 | **필수** |
| `PGADMIN_DEFAULT_EMAIL` | PgAdmin 관리자 이메일 | admin@example.com |
| `PGADMIN_DEFAULT_PASSWORD` | PgAdmin 비밀번호 | **변경 필수** |
| `AWS_ACCESS_KEY_ID` | AWS S3 접근 키 | **변경 필수** |
| `AWS_SECRET_ACCESS_KEY` | AWS S3 비밀 키 | **변경 필수** |

---

### 1-5. Spring Boot 애플리케이션 주요 설정

`AIRadar/backend/src/main/resources/application.properties`에서 환경변수로 외부화된 주요 설정:

| 설정 키 | 환경변수 | 기본값 (로컬) |
|---------|---------|--------------|
| `spring.datasource.url` | `POSTGRES_JDBC_URL` | jdbc:postgresql://localhost:5432/airadar |
| `spring.datasource.username` | `POSTGRES_USER` | airadar |
| `spring.datasource.password` | `POSTGRES_PASSWORD` | airadar_secret |
| `spring.data.redis.host` | `REDIS_HOST` | localhost |
| `spring.data.redis.port` | `REDIS_PORT` | 6379 |
| `spring.kafka.bootstrap-servers` | `KAFKA_BOOTSTRAP_SERVERS` | localhost:9092 |
| `jwt.secret` | `JWT_SECRET` | local-dev-secret-key-minimum-32-chars-ok |
| `jwt.access-token-expiration` | — | 900000 (15분) |
| `jwt.refresh-token-expiration` | — | 604800000 (7일) |
| `airflow.base-url` | `AIRFLOW_BASE_URL` | http://airflow:8081 |
| `job-forecast.ai.base-url` | `JOB_FORECAST_AI_BASE_URL` | http://ai-server:8000 |
| `spring.mail.host` | `SMTP_HOST` | (선택) |
| `newsletter.enabled` | `NEWSLETTER_ENABLED` | false |

---

### 1-6. DB 스키마 마이그레이션 (Flyway)

Spring Boot 기동 시 자동으로 Flyway 마이그레이션이 실행됩니다.

| 파일 | 내용 |
|------|------|
| `V1__create_gold_tables.sql` | news_items, papers, github_repos, tech_contents_view, tech_keyword_daily 등 핵심 테이블 |
| `V2__create_staging_tables.sql` | news_items_staging, papers_staging, github_repos_staging |
| `V3__add_pgvector.sql` | pgvector 확장 설치 + content_embeddings 테이블 (768차원) |
| `V4__add_company_timeline.sql` | company_news_timeline 테이블 |
| `V5__create_users_table.sql` | users 인증 테이블 |
| `V6__create_recommendation_tables.sql` | search_logs, user_interests, user_recommendations |

> **pgvector 확장**: PostgreSQL 이미지로 `pgvector/pgvector:pg16`을 사용하므로 별도 설치 불필요. V3 마이그레이션 파일에서 `CREATE EXTENSION IF NOT EXISTS vector;` 자동 실행.

**경로**: `AIRadar/backend/src/main/resources/db/migration/`

---

### 1-7. 빌드 방법

#### 백엔드 (Spring Boot)

```bash
# 의존성 설치 및 빌드 (테스트 제외)
cd AIRadar/backend
./gradlew build -x test

# 생성 결과물: build/libs/airadar-*.jar

# Spark용 Fat JAR 빌드 (Airflow에서 SparkSubmit에 사용)
./gradlew shadowJar
# 생성 결과물: build/libs/airadar-spark-*.jar

# ANTLR 버전 검증 (의존성 변경 후 필수)
./gradlew dependencies | grep antlr
# 반드시 antlr4-runtime:4.9.3 만 있어야 함
```

> ⚠️ **주의**: `build.gradle`의 ANTLR 충돌 해결 설정(`resolutionStrategy { force 'org.antlr:antlr4-runtime:4.9.3' }`)을 절대 제거하지 말 것.

#### 프론트엔드 (Next.js)

```bash
cd AIRadar/frontend
npm install
npm run build   # 프로덕션 빌드
npm start       # 프로덕션 서버 실행
```

---

### 1-8. 로컬 개발 환경 실행 방법

#### 사전 요구사항

- Docker Desktop (24+)
- Docker Compose (2.x)
- Java 17+ (JDK 권장: Eclipse Temurin 17)
- Node.js 18+, npm
- **GMS_KEY** (SSAFY GMS 프록시 키)

#### 실행 순서

```bash
# 1. 레포지토리 클론
git clone https://lab.ssafy.com/s14-bigdata-recom-sub1/S14P21B104.git
cd S14P21B104

# 2. 환경변수 설정 (GMS_KEY 필수 입력)
cp AIRadar/infra/.env.example AIRadar/infra/.env
# .env 파일에서 GMS_KEY 값 입력

# 3. Docker Compose로 전체 인프라 기동
cd AIRadar/infra
docker compose up -d

# 컨테이너 상태 확인
docker compose ps

# 4. 백엔드 로컬 실행 (Docker 외부에서 실행 시)
cd AIRadar/backend
./gradlew bootRun

# 5. 프론트엔드 로컬 실행
cd AIRadar/frontend
npm install
npm run dev
```

#### 서비스 기동 확인

| 서비스 | 확인 URL |
|--------|---------|
| Backend (Swagger UI) | http://localhost:8888/swagger-ui/index.html |
| Frontend | http://localhost:3000 |
| Airflow | http://localhost:8081 (admin / 설정한 비밀번호) |
| Spark Master UI | http://localhost:8080 |
| AI Server (Health) | http://localhost:8000/health |
| Crawling Server (Docs) | http://localhost:8002/docs |

---

### 1-9. 운영 환경 배포 방법

#### Server1 배포

```bash
# Server1에서 실행
cd /path/to/S14P21B104/AIRadar/infra

# 환경변수 파일 준비
cp .env.server1.example .env.server1
# .env.server1 수정 (모든 change-me / replace-me 값 변경)

# 서비스 기동 (--force-recreate 금지 — Compose 1.29.2 버그)
docker compose -f docker-compose.server1.yml --env-file .env.server1 up -d

# 서비스 재기동 시 (코드 변경 없는 경우)
docker compose -f docker-compose.server1.yml --env-file .env.server1 stop <service>
docker compose -f docker-compose.server1.yml --env-file .env.server1 rm -f <service>
docker compose -f docker-compose.server1.yml --env-file .env.server1 up -d <service>
```

> ⚠️ **kafka/zookeeper 재시작 금지**: 파이프라인 전체 중단됨. `spark-master`, `spark-worker1`, `airflow`만 필요 시 재시작.

#### Server2 배포

```bash
# Server2에서 실행
cd /path/to/S14P21B104/AIRadar/infra

# 환경변수 파일 준비
cp .env.server2.example .env.server2
# .env.server2 수정 (모든 change-me / replace-me 값 변경)

# 서비스 기동
docker compose -f docker-compose.server2.yml --env-file .env.server2 up -d

# AI Server만 실행 (선택적, GPU 필요 시)
docker compose -f docker-compose.server2.yml --env-file .env.server2 --profile ai up -d ai-server
```

#### Jenkins CI/CD (자동 배포)

Jenkins는 `AIRadar/infra/jenkins/Jenkinsfile`로 관리됩니다.

```
Pipeline 흐름:
  1. GitLab Webhook → Jenkins 트리거
  2. Gradle 빌드 (shadowJar 포함)
  3. Spark JAR + 설정 파일 → scp로 Server1 전송
  4. Spring Boot JAR → scp로 Server2 전송
  5. 컨테이너 재시작 (kafka/zookeeper 제외)
```

> ⚠️ Jenkins 배포 시 `tar | ssh` 방식으로 전체 소스 전송하면 OOM 발생 → JAR 파일만 scp로 전송해야 함.

---

### 1-10. 배포 시 특이사항

1. **ANTLR 충돌**: Spark 3.5.0과 Hibernate의 ANTLR 버전 충돌. `build.gradle`의 `resolutionStrategy { force 'org.antlr:antlr4-runtime:4.9.3' }` 설정 유지 필수.

2. **Logback 제거**: Spark 호환성 문제로 `spring-boot-starter-logging` exclude 후 Log4j2 사용. `log4j2.xml` 설정 파일 위치: `AIRadar/backend/src/main/resources/log4j2.xml`.

3. **Gradle JVM 메모리**: `AIRadar/backend/gradle.properties`에서 `-Xmx1024m -XX:MaxMetaspaceSize=512m` 설정 유지 (OOM 방지).

4. **pgvector PostgreSQL 이미지**: 일반 `postgres:16` 이미지 사용 불가. 반드시 `pgvector/pgvector:pg16` 사용.

5. **Airflow 메모리**: Spark LocalExecutor로 실행 시 Airflow 컨테이너 내부에서 Spark driver JVM이 실행됨. `mem_limit: 6g` 유지 필수.

6. **Airflow 환경변수 변경 시**: 컨테이너 재생성 필수 (`stop → rm → up`). `docker compose up --force-recreate` 사용 금지.

7. **docker-compose.server1.yml**: 반드시 `--env-file .env.server1` 명시. 누락 시 `SERVER2_PRIVATE_HOST`가 localhost로 폴백 → DB 연결 실패.

---

## 2. 외부 서비스 정보

### 2-1. SSAFY GMS (Claude API 프록시)

| 항목 | 내용 |
|------|------|
| 용도 | Claude Haiku API 호출 (뉴스/논문 AI 분석) |
| 프록시 URL | `https://gms.ssafy.io/gmsapi/api.anthropic.com/v1/messages` |
| 인증 방식 | API Key (`GMS_KEY` 환경변수) |
| 사용 모델 | `claude-haiku-4-5-20251001` |
| 설정 위치 | `AIRadar/ai-server/analyzer.py` |
| 주의사항 | GMS 키 만료 시 Silver Job 로그에 "Connection timed out"으로 나타남 (HTTP 401이 아님) |

> **키 발급**: SSAFY 관리자 통해 GMS_KEY 발급 요청. 환경변수 `GMS_KEY`에 설정.

---

### 2-2. AWS S3 (운영 환경 스토리지)

| 항목 | 내용 |
|------|------|
| 용도 | Delta Lake Bronze/Silver 레이어 저장 |
| 리전 | ap-northeast-2 (서울) |
| 버킷명 | `airadar-delta` |
| 경로 구조 | `airadar-delta/bronze/{source_type}/batch_date={date}/`, `airadar-delta/silver/{source_type}/` |
| 인증 | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` 환경변수 |
| 설정 위치 | `.env.server1`, `.env.server2` |

---

### 2-3. GitHub API (크롤링)

| 항목 | 내용 |
|------|------|
| 용도 | GitHub 트렌딩 레포/PR 수집 |
| 인증 | Personal Access Token (선택 사항) |
| 환경변수 | `GITHUB_TOKEN` |
| 설정 위치 | `.env.server1` |
| 주의사항 | 미설정 시 API Rate Limit (60 req/hour) 적용 |

---

### 2-4. HuggingFace 임베딩 모델

| 항목 | 내용 |
|------|------|
| 모델명 | `paraphrase-multilingual-mpnet-base-v2` |
| 차원 | 768 |
| 다운로드 방식 | AI 서버 컨테이너 최초 기동 시 자동 다운로드 |
| 저장 경로 | Docker 볼륨 (ai-server 컨테이너 내부 캐시) |
| 주의사항 | 최초 기동 시 모델 다운로드로 수분 소요. 인터넷 연결 필수. |

---

### 2-5. SMTP (뉴스레터, 선택 사항)

| 항목 | 내용 |
|------|------|
| 용도 | 주간 AI 뉴스레터 이메일 발송 |
| 환경변수 | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD` |
| 기본값 | 비활성화 (`NEWSLETTER_ENABLED=false`) |
| 활성화 방법 | `.env` 파일에서 `NEWSLETTER_ENABLED=true` 및 SMTP 설정 입력 |
| 발송 일정 | 매주 월요일, 금요일 09:00 KST (기본값) |

---

## 3. DB 덤프 파일

DB 덤프 파일은 `exec/` 폴더에 위치합니다.

| 파일명 | 설명 |
|--------|------|
| `airadar_schema_dump.sql` | 전체 테이블 DDL (스키마만, 데이터 제외) |
| `airadar_data_dump.sql` | 시연용 샘플 데이터 포함 전체 덤프 |

### 덤프 복원 방법

```bash
# 1. 스키마 생성 (Flyway 마이그레이션으로 자동 생성이 권장됨)
#    수동으로 복원할 경우:
psql -h localhost -p 5432 -U airadar -d airadar -f exec/airadar_schema_dump.sql

# 2. 데이터 복원
psql -h localhost -p 5432 -U airadar -d airadar -f exec/airadar_data_dump.sql

# 운영 서버 (Server2)에서
psql -h localhost -p 15432 -U airadar -d airadar -f exec/airadar_data_dump.sql
```

> **권장 방법**: Spring Boot 기동 시 Flyway가 자동으로 스키마를 생성하므로, 시연 데이터만 별도 복원하면 됩니다.

---

## 4. 시연 시나리오

### 4-1. 시연 환경 접속 정보

| 서비스 | URL |
|--------|-----|
| **메인 서비스 (Frontend)** | http://j14b104a.p.ssafy.io:13000 |
| **Backend API** | http://j14b104a.p.ssafy.io/api |
| **Airflow** | http://j14b104a.p.ssafy.io/airflow |
| **Spark UI** | http://j14b104.p.ssafy.io:18080 |

---

### 4-2. 시연 순서 및 화면별 설명

#### [Step 1] 서비스 접속 및 회원가입/로그인

1. **메인 페이지** 접속: `http://j14b104a.p.ssafy.io`
   - AI 기술 트렌드 대시보드 첫 화면 확인
   - 비로그인 상태에서도 뉴스/논문/GitHub 트렌드 조회 가능

2. **회원가입**: 우측 상단 "회원가입" 클릭
   - 이메일, 비밀번호 입력
   - 관심 기술 키워드 선택 (NLP, Vision, RL 등)

3. **로그인**: 이메일/비밀번호로 로그인
   - JWT 발급 확인 (Access Token 15분, Refresh Token 7일)

---

#### [Step 2] 대시보드 — AI 기술 트렌드 분석

**화면**: `/dashboard`

1. **키워드 트렌드** 차트 확인
   - 일별 키워드 언급 빈도 추이 (tech_keyword_daily 기반)
   - 클릭 위치: 좌측 사이드바 → "대시보드"

2. **기술 생애주기** 시각화
   - 기술별 연구 → 상용화 진행 단계 확인
   - 기술 이름 클릭 시 관련 뉴스/논문 필터링

3. **직업별 AI 대체 위험도** 차트
   - 직업 유형별 위험도 비교

---

#### [Step 3] 뉴스 피드

**화면**: `/news`

1. **뉴스 목록** 확인
   - AI 분석 결과 (카테고리, 감정, 키워드 태그) 표시
   - `GET /api/v1/news?page=0&size=20`

2. **뉴스 검색**: 상단 검색바에 키워드 입력 (예: "GPT", "LLM")
   - 벡터 유사도 검색 (pgvector) + 키워드 검색 하이브리드
   - `GET /api/search?q=LLM`

3. **뉴스 상세** 클릭
   - AI 요약, 키워드, 감정 분석 결과 확인
   - 북마크 버튼 클릭 (`POST /api/v1/events/article-bookmark`)
   - 좋아요 버튼 클릭 (`POST /api/v1/events/article-like`)

---

#### [Step 4] 논문 피드

**화면**: `/papers`

1. **논문 목록** 확인 (arXiv 수집 논문)
   - 카테고리별 필터 (NLP, Vision, RL, Multimodal, Robotics)
   - `GET /api/v1/papers?page=0&size=20`

2. **논문 상세** 클릭
   - AI 생성 요약, 연구 분야, 키워드 확인

3. **개인화 추천** 논문 확인
   - 로그인 상태에서 우측 "추천 논문" 위젯 확인
   - `POST /api/v1/recommendations/papers`

---

#### [Step 5] GitHub 트렌딩

**화면**: `/github`

1. **GitHub 트렌딩 레포** 목록 확인
   - Star 수, Fork 수, 언어별 분류
   - `GET /api/v1/github/trending`

---

#### [Step 6] 개인화 추천

**화면**: `/recommendations`

1. **뉴스 개인화 추천** 확인
   - Spark ALS 협업 필터링 기반 추천
   - 4단계 Fallback: Redis 캐시 → ALS → 키워드 필터 → Cold Start (최근 7일 인기)
   - `GET /api/v1/recommendations/news`

2. **트렌딩 추천** (비로그인 포함)
   - `GET /api/v1/recommendations/trending/news`

---

#### [Step 7] 파이프라인 실시간 시연 (선택)

**목적**: 데이터 수집 → 처리 → 서빙 파이프라인 흐름 시연

```bash
# 1. 더미 데이터 주입 (크롤링 서버)
curl -X POST "http://j14b104.p.ssafy.io:18002/crawl/dummy?date=$(date +%Y-%m-%d)&news_count=5&paper_count=5&github_count=1&publish_kafka=true"

# 2. Airflow에서 Silver/Gold DAG 수동 트리거
# http://j14b104a.p.ssafy.io/airflow → silver_refinement DAG → Trigger
# → gold_serving DAG → Trigger

# 3. 프론트엔드에서 새 데이터 확인
```

**Airflow 접속**: http://j14b104a.p.ssafy.io/airflow (admin / 설정된 비밀번호)

**DAG 실행 순서**:
1. `silver_refinement` DAG 트리거 → Spark SilverRefinementJob 실행 → AI 분석
2. `gold_serving` DAG 트리거 → GoldServingJob 실행 → PostgreSQL Upsert
3. Frontend 새로고침 → 새 데이터 표시 확인

---

### 4-3. 주요 API 엔드포인트 요약

| 기능 | Method | URL |
|------|--------|-----|
| 뉴스 목록 | GET | `/api/v1/news` |
| 뉴스 상세 | GET | `/api/v1/news/{articleId}` |
| 논문 목록 | GET | `/api/v1/papers` |
| GitHub 트렌딩 | GET | `/api/v1/github/trending` |
| 통합 검색 | GET | `/api/search?q={query}` |
| 대시보드 키워드 | GET | `/api/v1/dashboard/keywords` |
| 기술 생애주기 | GET | `/api/v1/dashboard/lifecycle` |
| 직업 위험도 | GET | `/api/v1/dashboard/jobs` |
| 뉴스 추천 | GET | `/api/v1/recommendations/news` |
| 트렌딩 추천 | GET | `/api/v1/recommendations/trending/news` |
| 기사 조회 이벤트 | POST | `/api/v1/events/article-view` |
| 북마크 | POST | `/api/v1/events/article-bookmark` |
| 좋아요 | POST | `/api/v1/events/article-like` |
| 북마크 목록 | GET | `/api/v1/users/me/bookmarks` |
| 좋아요 목록 | GET | `/api/v1/users/me/likes` |
| 회원가입 | POST | `/api/v1/auth/signup` |
| 로그인 | POST | `/api/v1/auth/login` |

---

### 4-4. 트러블슈팅 체크리스트

| 증상 | 원인 | 해결 방법 |
|------|------|----------|
| Silver Job 데이터 0건 | Bronze batch_date ≠ Airflow 실행일 | `--date` 파라미터를 Bronze 파티션 날짜와 일치 |
| AI 서버 "Connection timed out" | GMS_KEY 만료 | 새 GMS_KEY 발급 후 `ai-server` 컨테이너 재시작 |
| Airflow Exit Code -9 | 컨테이너 OOM | `mem_limit: 6g` 확인, `max_active_runs=1` 적용 |
| PostgreSQL 연결 실패 (Server1) | `--env-file` 누락 | 항상 `--env-file .env.server1` 명시 |
| Spark 빌드 실패 | ANTLR 버전 충돌 | `build.gradle`의 force 설정 확인 |
| HuggingFace 모델 로드 실패 | 인터넷 연결 없음 | 사전에 모델 파일 캐시 또는 인터넷 허용 |
| Kafka DagRunAlreadyExists | 스케줄된 DAG run과 충돌 | Airflow DB에서 중복 dag_run 삭제 후 재트리거 |
