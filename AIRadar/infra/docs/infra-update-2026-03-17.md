# 인프라 변경사항 공지 (2026-03-17)

> **대상**: 전체 팀원
> **작성자**: DevOps
> **관련 브랜치**: develop

---

## 요약

Jenkins CI/CD 파이프라인과 Server1 인프라에 대한 전면 개선이 완료되었습니다.
**Airflow 재시작 루프** 문제가 수정되었으며, **Jenkins 자동 배포** 기반이 갖춰졌습니다.

---

## 1. Jenkins 파이프라인 개선

### 변경 전
- 수동 트리거만 가능 (GitLab push 시 자동 실행 없음)
- 테스트 스테이지 없음
- Server1/2 순차 배포 (느림)
- 배포 실패 시 롤백 불가
- Discord 알림 없음

### 변경 후
| 항목 | 내용 |
|------|------|
| **자동 트리거** | `develop` 브랜치 push 시 자동 빌드 (GitLab Webhook 설정 필요 — 아래 참고) |
| **테스트 스테이지** | `./gradlew test` 실행 후 결과를 JUnit Report로 저장 |
| **병렬 배포** | Server1/2 동시 배포로 배포 시간 단축 |
| **Health Check** | 배포 후 `/api/health` 엔드포인트 10회 재시도 (15초 간격) |
| **자동 롤백** | Health Check 실패 시 이전 JAR로 자동 복구 |
| **Discord 알림** | 성공/실패 시 Discord Webhook 발송 |
| **타임아웃** | 전체 파이프라인 30분 제한 |

### Jenkins UI 설정 필요 (DevOps 담당자 작업)

GitLab Webhook 자동 트리거를 활성화하려면 아래 설정이 필요합니다.

1. **Jenkins 관리 → Plugin Manager → `GitLab Plugin` 설치 확인**

2. **Jenkins Job 설정 → Build Triggers**
   - `Build when a change is pushed to GitLab` 체크
   - **Secret token** Generate → 복사

3. **GitLab → 프로젝트 Settings → Webhooks**
   - URL: `http://<jenkins-host>:18083/project/<job-name>`
   - Secret Token: 위에서 복사한 값 붙여넣기
   - Trigger: `Push events`
   - Branch filter: `develop`
   - **저장 후 Test → Push events** 클릭으로 동작 확인

> ⚠️ Secret Token 없이 Webhook을 등록하면 `HTTP 401 Invalid token` 오류가 발생합니다.

---

## 2. 배포 스크립트 개선 (`deploy-server1/2.sh`)

JAR 백업 및 롤백 기능이 추가되었습니다.

### 추가된 기능
- **배포 전 JAR 백업**: `airadar-spark.jar` → `airadar-spark.jar.backup` 자동 생성
- **`.env` 파일 검증**: `.env.server1` / `.env.server2` 없으면 배포 즉시 중단
- **`--rollback` 플래그**: 이전 버전으로 수동 복구 가능

```bash
# 수동 롤백 (긴급 시)
cd ~/S14P21B104
bash AIRadar/infra/scripts/deploy-server1.sh --rollback
bash AIRadar/infra/scripts/deploy-server2.sh --rollback
```

---

## 3. Airflow 재시작 루프 수정 (Server1)

### 근본 원인
Airflow 컨테이너가 `.env.server1` 없이 생성된 적이 있어서 `SERVER2_PRIVATE_HOST=localhost`로 PostgreSQL 연결 시도 → DB 연결 실패 → 재시작 루프

컨테이너를 `stop → rm → up`으로 재생성하면서 `.env.server1`의 정확한 호스트로 연결됩니다.

### 변경된 설정 (`docker-compose.server1.yml`)

| 항목 | 변경 전 | 변경 후 | 이유 |
|------|---------|---------|------|
| Airflow 실행 방식 | `airflow standalone` | `scheduler & webserver` 분리 | standalone은 부하 시 webserver 종료 |
| Webserver worker timeout | 설정 없음 (기본 120s) | `300s` | DAG 실행 중 웹서버 503 방지 |
| Webserver workers | 설정 없음 (기본 4) | `2` | 메모리 절약 |
| 동시 Task 제한 | 설정 없음 | PARALLELISM=4, MAX_ACTIVE_TASKS=2 | Task 폭발 방지 |
| 동시 DAG Run 제한 | 설정 없음 | MAX_ACTIVE_RUNS_PER_DAG=1 | 밀린 catchup 실행 제한 |
| Spark Worker 메모리 | `SPARK_WORKER_MEMORY=4g` | `2g` | mem_limit(3g)와 불일치 해소 |

---

## 4. Gradle OOM 수정 (기존 hotfix 검토 완료)

`AIRadar/backend/gradle.properties`의 JVM 힙 설정(`-Xmx1536m -XX:MaxMetaspaceSize=512m`)은 **Jenkins 빌드 중 OOM으로 Zookeeper까지 강제 종료되는 현상을 완화**합니다.

Server1(16GB RAM) 기준 현재 서비스별 메모리 할당:

| 서비스 | mem_limit |
|--------|-----------|
| Zookeeper | 512m |
| Kafka | 1g |
| Spark Master | 1g |
| Spark Worker1 | 3g |
| Airflow | 2g |
| Crawler | 512m |
| Jenkins | 3g |
| **합계** | **~11g** |

Jenkins 빌드 시 Gradle JVM이 추가로 ~1.5g를 사용하므로 총 ~12.5g로 16g 한계 내에 있습니다.

---

## 적용 방법

변경사항은 `develop` 브랜치에 반영되어 있습니다.

```bash
# Server1에서 컨테이너 재생성 (env 파일 재적용)
cd ~/S14P21B104/AIRadar/infra
sudo docker-compose --env-file .env.server1 -f docker-compose.server1.yml stop airflow
sudo docker-compose --env-file .env.server1 -f docker-compose.server1.yml rm -f airflow
sudo docker-compose --env-file .env.server1 -f docker-compose.server1.yml up -d airflow
```

---

## 문의

- Jenkins/배포 관련: DevOps 담당자
- Airflow DAG catchup 설정: Data 담당자
- Spring Boot / Frontend: 각 파트 담당자
