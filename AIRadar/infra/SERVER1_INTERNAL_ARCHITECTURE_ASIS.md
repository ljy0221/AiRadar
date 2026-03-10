# 1번서버 내부 서비스 연결 구조 As-Is 정리

## 1. 목적

1번서버에 배치된 `crawler`, `Kafka`, `Spark`의 현재 연결 구조를 코드 기준으로 확인하고, 이후 `S3 VPC Endpoint` 적용 전 실제 S3 접근 주체를 정리한다.

## 2. 현재 배치 구성

1번서버용 배포 파일은 [docker-compose.server1.yml](/Z:/S14P21B104/AIRadar/infra/docker-compose.server1.yml) 기준이다.

- `zookeeper`
- `kafka`
- `spark-master`
- `spark-worker`
- `crawler`

주요 포트:

- Kafka: `9092`, `29092`
- Spark Master: `7077`
- Spark UI: `8080`, `4040`
- Crawler API: `8002`

## 3. 현재 운영 기준 데이터 흐름

현재 코드 기준 기본 흐름은 아래와 같다.

1. crawler가 외부 사이트에서 데이터를 수집
2. Spark `BronzeIngestionJob`이 crawler API를 HTTP로 호출
3. Spark가 crawler 응답 데이터를 Bronze에 적재
4. Spark `SilverRefinementJob`이 Bronze를 읽어 Silver로 가공
5. 가공 결과를 다시 Silver 저장소에 적재

즉 현재 기준 주 흐름은 아래와 같다.

`crawler -> Spark(HTTP 호출) -> Bronze -> Spark -> Silver`

## 4. 세부 연결 구조

### 4.1 Crawler -> Spark HTTP 연계

[BronzeIngestionJob.java](/Z:/S14P21B104/AIRadar/backend/src/main/java/com/mcp/airadar/spark/BronzeIngestionJob.java) 기준으로 Spark는 아래 방식으로 crawler를 직접 호출한다.

- `CRAWL_SERVER_URL` 환경변수 사용
- 기본 호출 주소: `http://localhost:8002`
- 실제 요청 경로: `/crawl/jobs`

처리 방식:

- Spark가 news/github 수집 요청 생성
- crawler API에 HTTP POST 요청 전송
- crawler 응답의 `items` 배열을 Spark가 받아 Bronze Delta로 저장

즉 Bronze 적재의 실제 실행 주체는 Spark다.

### 4.2 Bronze -> Silver Spark 처리

[silver_refinement_dag.py](/Z:/S14P21B104/AIRadar/airflow/dags/silver_refinement_dag.py)와 [SilverRefinementJob.java](/Z:/S14P21B104/AIRadar/backend/src/main/java/com/mcp/airadar/spark/SilverRefinementJob.java) 기준으로:

- Spark가 Bronze Delta를 읽음
- `news`, `paper`는 AI 서버 HTTP 분석 호출
- `github`는 내부 정제 로직 수행
- 결과를 Silver Delta로 저장

즉 Silver 처리도 Spark 중심 배치 구조다.

### 4.3 Kafka 위치

Kafka는 1번서버 구성에 포함되어 있고 crawler에서도 Kafka 발행 코드가 존재한다.

확인 결과:

- crawler는 `kafka:9092`로 메시지 발행 가능
- `KafkaBronzeConsumerJob`도 구현되어 있음
- 다만 현재 기본 Bronze 적재 경로는 Kafka 소비가 아니라 Spark의 crawler API 직접 호출 방식

따라서 현재 작업 기준에서 Kafka는 주 흐름이 아니라 보조 경로 또는 차후 전환 가능 경로로 본다.

## 5. 서버 간 연결 구조

2번서버용 배포 파일은 [docker-compose.server2.yml](/Z:/S14P21B104/AIRadar/infra/docker-compose.server2.yml) 기준이다.

server2 Airflow는 아래 값으로 server1 내부 서비스에 접근한다.

- `AIRFLOW_CONN_SPARK_DEFAULT=spark://SERVER1_PRIVATE_HOST:7077`
- `CRAWLING_API_BASE_URL=http://SERVER1_PRIVATE_HOST:8002`

즉 현재 구조는 다음과 같다.

- server1: crawler, Kafka, Spark
- server2: Airflow, backend, ai-server, postgres, frontend

Airflow가 server1의 Spark와 crawler를 원격 호출하는 구조다.

## 6. S3 연계 관점 핵심

[S3_MIGRATION_GUIDE.md](/Z:/S14P21B104/AIRadar/infra/S3_MIGRATION_GUIDE.md)와 Spark Job 코드 기준으로, 현재 저장소는 `MinIO -> AWS S3 전환`을 고려한 상태다.

현재 작업 기준 핵심 판단은 아래와 같다.

- Bronze를 쓰는 주체: Spark
- Silver를 쓰는 주체: Spark
- 따라서 S3 VPC Endpoint 적용 시 우선 확인해야 할 실제 접근 주체는 Spark 계열 서비스

즉 이후 S3 private 연결 작업은 Kafka보다 먼저 Spark 기준으로 보는 것이 맞다.

## 7. 이번 작업 기준 정리

이번 1번 작업에서는 현재 구조를 아래처럼 정의한다.

- crawler는 외부 수집 담당
- Spark는 crawler를 HTTP로 호출해 Bronze를 적재
- Spark는 Bronze를 읽어 Silver를 적재
- Kafka는 현재 필수 주 경로가 아니라 병행 구성 요소

따라서 이번 문서와 이후 설명은 아래 구조를 기준으로 맞춘다.

`crawler -> Spark(HTTP 호출) -> Bronze(S3) -> Spark -> Silver(S3)`

## 8. 후속 확인 필요 항목

다음 단계에서 확인할 항목은 아래와 같다.

1. 운영 환경의 `BRONZE_BASE_PATH`, `SILVER_BASE_PATH`, `S3_ENDPOINT` 실제 값
2. Spark master/worker 중 실제 S3 접근 컨테이너
3. AWS 자격증명 또는 IAM Role 적용 주체
4. 해당 주체 기준 VPC Endpoint 및 버킷 정책 요청 정보

## 9. 운영 환경 변수 확인 결과

server1 환경파일은 [infra/.env.server1](/Z:/S14P21B104/AIRadar/infra/.env.server1) 기준으로 확인했다.

확인된 값:

- `RAW_S3_BUCKET=airadar-delta`
- `BRONZE_BASE_PATH=s3a://airadar-delta/bronze`
- `SILVER_BASE_PATH=s3a://airadar-delta/silver`
- `S3_ENDPOINT=https://s3.ap-northeast-2.amazonaws.com`
- `AWS_ACCESS_KEY_ID=` 비어 있음
- `AWS_SECRET_ACCESS_KEY=` 비어 있음

판단:

- 저장 경로는 이미 AWS S3 기준으로 작성되어 있음
- endpoint도 `ap-northeast-2` 리전 S3 public endpoint 기준으로 적혀 있음
- access key / secret key는 현재 파일 기준 비어 있음

즉 현재 저장소에서 확정 가능한 내용은 아래와 같다.

- S3 버킷명: `airadar-delta`
- Bronze 경로: `s3a://airadar-delta/bronze`
- Silver 경로: `s3a://airadar-delta/silver`
- S3 접근 대상 리전 endpoint: `https://s3.ap-northeast-2.amazonaws.com`

반면 실제 인증 방식은 아직 확정할 수 없다.

가능한 경우:

- 배포 시 외부에서 `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`를 주입
- 또는 추후 IAM Role 방식으로 전환

## 10. S3 접근 주체 정리

[docker-compose.server1.yml](/Z:/S14P21B104/AIRadar/infra/docker-compose.server1.yml) 기준으로 아래 환경변수는 `spark-master`, `spark-worker`에 주입된다.

- `BRONZE_BASE_PATH`
- `SILVER_BASE_PATH`
- `S3_ENDPOINT`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

[SparkUtils.java](/Z:/S14P21B104/AIRadar/backend/src/main/java/com/mcp/airadar/spark/utils/SparkUtils.java) 기준으로 Spark Job은 `BRONZE_BASE_PATH`, `SILVER_BASE_PATH`를 직접 읽어 Delta 경로를 구성한다.

따라서 현재 코드 기준 S3 접근 주체는 다음과 같이 판단한다.

- Bronze 쓰기: Spark Job
- Bronze 읽기: Spark Job
- Silver 쓰기: Spark Job

즉 S3 연계와 VPC Endpoint 작업의 1차 대상은 `Spark 계열 컨테이너`다.

## 11. 결론

현재 1번서버의 실제 운영 기준 구조는 `Kafka 중심 적재`가 아니라 `Spark 중심 적재`에 가깝다.

따라서 이번 작업과 다음 S3 VPC Endpoint 작업은 아래 기준으로 진행한다.

`crawler -> Spark(HTTP 호출) -> Bronze(S3) -> Spark -> Silver(S3)`
