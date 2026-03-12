# Spark 리팩토링 비교 보고서

> 기준일: 2026-03-12
> 대상: "Server1에 집중된 Spark 처리"를 "Server1 + Server2 분산 처리 + S3 저장" 구조로 전환하는 방안 검토

---

## 1. 요약

이 문서는 현재 저장소 구현 설명이 아니라, 팀이 합의한 **목표 아키텍처**를 기준으로 정리한다.
즉 아래 내용은 "앞으로 맞춰갈 설계 기준"이다.

핵심 기준은 아래와 같다.

- `Bronze`는 크롤링 원본 데이터이며 `Kafka -> S3`로 적재된다.
- `Silver`는 Spark Worker가 Bronze를 읽어 1차 가공 후 다시 `S3`에 저장한다.
- `Gold`는 Silver를 AI 모델까지 거쳐 사용자용 데이터로 만든 결과이며 `PostgreSQL`에 저장된다.
- `Server1`은 수집, 스케줄링, 메인 애플리케이션, Spark 클러스터 진입점 역할을 맡는다.
- `Server2`는 `Spark Worker2`를 통해 분산 처리 자원을 추가 제공한다.

즉 이번 리팩토링은 **수집/저장/분산처리/서빙 역할을 명확히 분리한 목표 구조를 기준으로 인프라를 재정렬하는 작업**이다.

---

## 2. 목표 구조(To-Be)

### 2.1 서버 역할

`Server1`

- Crawler
- Kafka
- Airflow
- Spark Master
- Spark Worker1
- PostgreSQL
- Redis
- Spring Boot
- Frontend

`Server2`

- Spark Worker2

외부

- S3

### 2.2 데이터 처리 관점

현재 목표 기준에서 데이터 흐름은 아래처럼 정의한다.

`Crawler -> Kafka -> Bronze(S3) -> Spark 분산 처리 -> Silver(S3) -> Spark + AI -> Gold(PostgreSQL) -> Spring Boot -> Frontend`

### 2.3 목표 요약

리팩토링 목표는 아래 한 줄로 정리할 수 있다.

`Server1이 수집·스케줄링·서빙의 중심이 되고, Server2는 Spark Worker2로 분산 처리 자원을 제공하며, 중간 데이터는 S3에 저장한다.`

### 2.4 중요한 기술적 의미

여기서 "2서버에 Spark를 분산한다"는 말은,
"뉴스는 Server1, Git은 Server2"처럼 소스별 고정 배치라는 뜻이 아니다.

Spark Standalone에서는 다음 방식으로 동작한다.

- Airflow가 Job을 Spark Master에 제출
- Master가 사용 가능한 Worker1/Worker2에 Executor를 배치
- 각 소스의 Task가 두 서버의 Executor에 나뉘어 실행

즉 분산의 단위는 "서비스"가 아니라 **Executor/Task**다.

이 점을 보고서와 회의에서 분명히 해 둘 필요가 있다.

---

## 3. 레이어 정의

### 3.1 Bronze

- 의미: 크롤링 원본 데이터
- 흐름: `Crawler -> Kafka -> S3`
- 특징: Spark 가공 없이 원본을 먼저 적재

### 3.2 Silver

- 의미: Bronze 데이터를 Spark Worker가 읽어 1차 가공한 데이터
- 흐름: `Bronze(S3) -> Spark Worker1/2 -> Silver(S3)`
- 특징: 분산 처리 결과가 다시 S3에 저장됨

### 3.3 Gold

- 의미: Silver를 AI 모델까지 거쳐 사용자 서비스용 형태로 만든 데이터
- 흐름: `Silver(S3) -> Spark + AI -> PostgreSQL`
- 특징: 최종 저장소는 `S3`가 아니라 `PostgreSQL`

---

## 4. 이번 리팩토링의 장점

### 5.1 성능 측면

- `news`, `paper`, `github` 처리 시 두 Worker 자원을 사용할 수 있다.
- Airflow가 Server1에 있으므로 스케줄링과 Spark 제출 경로가 단순해진다.
- 배치 시간이 줄어들면 Airflow 스케줄 중첩 위험도 줄어든다.

### 5.2 안정성 측면

- Bronze/Silver가 S3에 있으면 서버 재기동이나 교체와 무관하게 중간 데이터가 유지된다.
- Worker 1대 이슈가 있어도 클러스터 전체 중단 가능성을 낮출 수 있다.

### 5.3 운영 측면

- Spark Master는 Server1에 고정하고 Worker만 추가하면 되므로 구조가 단순하다.
- 추후 Server3를 붙이는 방식으로 확장하기 쉽다.

---

## 5. 주의할 점

### 6.1 "분산"과 "분리 배치"는 다르다

현재 논의에서 가장 오해하기 쉬운 부분이다.

- 분산 처리: 하나의 Spark Job 내부 Task가 여러 Worker에 나뉘어 실행
- 분리 배치: 뉴스 Job은 A 서버, 깃허브 Job은 B 서버처럼 고정 운영

지금 구조는 전자다.
만약 소스별 서버 고정 배치를 원하면 Spark 설정이 아니라 DAG 분리, 큐 분리, 별도 클러스터 분리가 필요하다.

### 5.2 S3 접근 주체를 명확히 해야 한다

Bronze 적재와 Silver 처리 결과 저장, Gold 이전 중간 데이터 사용까지 모두 S3 연계가 핵심이다.
따라서 아래 항목이 서버별로 모두 맞아야 한다.

- Kafka -> S3 적재 경로 구현 방식
- Server1 Worker의 S3 접근
- Server2 Worker2의 S3 접근
- 인증 방식(access key 또는 IAM role)
- `S3_ENDPOINT`, `BRONZE_BASE_PATH`, `SILVER_BASE_PATH` 일치

### 5.3 네트워크 포트 확인이 필요하다

분산 운영 시 최소한 아래 통신이 안정적으로 열려 있어야 한다.

- Server1 내부: Airflow -> Spark Master
- Server2 -> Server1: `7077` (Spark Master)
- Server1/Server2 -> S3 endpoint
- Spark Worker -> PostgreSQL `5432`

## 6. 리팩토링 후 기대 아키텍처

```text
[Server1]
Crawler -> Kafka
Airflow
Spark Master
Spark Worker1
PostgreSQL / Redis / Spring Boot / Frontend

                spark-submit
                    |
                    v
              Spark Master
               /        \
              /          \
     Spark Worker1    Spark Worker2
      (Server1)         (Server2)
            \            /
             \          /
      Bronze(S3) -> Silver(S3)
                     |
                     v
             Spark + AI -> PostgreSQL(Gold)
```

핵심은 아래다.

- 수집은 Kafka로 decouple
- 처리 자원은 Worker 2대로 scale-out
- 중간 저장은 S3로 외부화
- 최종 서빙은 PostgreSQL

## 7. 실행 체크리스트

### 필수

1. `Server1`에 `Airflow`를 포함한 전체 실행 구성이 정리되는지 확인
2. `Server2`의 `spark-worker2`가 실제 운영에 올라와 `Server1` Master에 등록되는지 확인
2. Airflow에서 제출한 Job이 Spark UI에서 두 Worker에 Executor를 분산 배치하는지 확인
3. `BRONZE_BASE_PATH`, `SILVER_BASE_PATH`, `S3_ENDPOINT`를 두 서버에서 동일 기준으로 맞춤
4. S3 인증 방식을 access key 또는 IAM role 중 하나로 확정
5. Server1/Server2 간 방화벽 포트 확인

### 권장

1. Bronze 적재가 `Kafka -> S3` 기준으로 구현/문서화되도록 통일
2. 서버별 책임을 기준으로 compose와 문서를 일치시킴
3. Spark UI 캡처와 처리 시간 전/후 비교를 운영 보고서에 추가

## 8. 서버별 Compose 배치안

### 8.1 `docker-compose.server1.yml`

`Server1`은 수집, 스케줄링, Spark 클러스터 진입점, 서비스 제공 역할을 맡는다.

| 서비스 | 역할 |
|--------|------|
| `crawler` | 외부 데이터 수집 |
| `kafka` | 크롤링 원본 메시지 버퍼/이벤트 허브 |
| `zookeeper` | Kafka 의존 서비스 |
| `airflow` | 배치 스케줄링 및 Spark Job 제출 |
| `spark-master` | Spark 클러스터 마스터 |
| `spark-worker1` | 1차 분산 처리 자원 |
| `postgres` | Gold 데이터 최종 저장소 |
| `redis` | 캐시 |
| `backend` | Spring Boot API |
| `frontend` | 사용자 UI |

권장 외부 포트:

| 서비스 | 호스트 포트 | 컨테이너 포트 |
|--------|-------------|---------------|
| `kafka` internal | `19092` | `9092` |
| `kafka` external | `29092` | `29092` |
| `postgres` | `15432` | `5432` |
| `redis` | `16379` | `6379` |
| `spark-master` | `17077` | `7077` |
| `spark-master-ui` | `18080` | `8080` |
| `spark-app-ui` | `14040` | `4040` |
| `crawler` | `18002` | `8002` |
| `ai-server` | `18000` | `8000` |
| `airflow` | `18081` | `8080` |
| `backend` | `18888` | `8888` |
| `frontend` | `13000` | `3000` |

### 8.2 `docker-compose.server2.yml`

`Server2`는 Spark 분산 처리 확장 노드 역할을 맡는다.

| 서비스 | 역할 |
|--------|------|
| `spark-worker2` | 2차 분산 처리 자원 |

권장 외부 포트:

| 서비스 | 호스트 포트 | 컨테이너 포트 |
|--------|-------------|---------------|
| `spark-worker2-ui` | `18082` | `8082` |

### 8.3 외부 서비스

| 서비스 | 역할 |
|--------|------|
| `S3` | Bronze / Silver 저장소 |

### 8.4 목표 배치 요약

| 구분 | Server1 | Server2 | 외부 |
|------|---------|---------|------|
| 수집 | `crawler` | - | - |
| 메시지 허브 | `kafka`, `zookeeper` | - | - |
| 스케줄링 | `airflow` | - | - |
| Spark 제어 | `spark-master` | - | - |
| Spark 실행 | `spark-worker1` | `spark-worker2` | - |
| 중간 저장 | - | - | `S3` |
| 최종 저장 | `postgres` | - | - |
| 캐시 | `redis` | - | - |
| API | `backend` | - | - |
| UI | `frontend` | - | - |

## 9. 결론

목표 구조의 핵심은 다음과 같다.

1. `Server1`은 크롤링, Kafka, Airflow, Spark Master/Worker1, 애플리케이션 서빙을 담당한다.
2. `Server2`는 `Spark Worker2`를 통해 분산 처리 자원을 제공한다.
3. `Bronze/Silver`는 `S3`, `Gold`는 `PostgreSQL`에 저장한다.

따라서 이번 리팩토링은
**수집 분리 + Spark 분산 처리 + S3 기반 중간 저장 + PostgreSQL 기반 최종 서빙** 구조를 확정하는 작업으로 정리할 수 있다.
