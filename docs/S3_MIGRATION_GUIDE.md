# MinIO → AWS S3 전환 가이드

현재 AIRadar는 MinIO(로컬 S3-compatible)를 Delta Lake 저장소로 사용한다.
이 문서는 AWS S3로 전환할 때 변경해야 할 모든 항목을 체크리스트 형태로 정리한다.

---

## 1. AWS 사전 준비

### 1-1. S3 버킷 생성

```bash
# AWS CLI 사용 시
aws s3api create-bucket \
  --bucket airadar-delta \
  --region ap-northeast-2 \
  --create-bucket-configuration LocationConstraint=ap-northeast-2

# 버킷 내 폴더 구조는 자동 생성 (MinIO처럼 별도 init 불필요)
# s3://airadar-delta/bronze/
# s3://airadar-delta/silver/
```

> **버킷 이름 주의**: S3는 전역 unique 이름을 요구한다. `airadar-delta`가 사용 중이면 다른 이름 사용.

### 1-2. IAM 정책 생성

Spark Job이 S3에 읽고 쓸 수 있는 최소 권한 정책:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket",
        "s3:GetBucketLocation",
        "s3:AbortMultipartUpload",
        "s3:ListMultipartUploadParts"
      ],
      "Resource": [
        "arn:aws:s3:::airadar-delta",
        "arn:aws:s3:::airadar-delta/*"
      ]
    }
  ]
}
```

### 1-3. IAM 사용자 또는 역할 생성

- 정책을 새 IAM 사용자에 연결 → Access Key 발급
- 또는 EC2/ECS 배포 시 IAM Role 사용 권장 (키 없이 자동 인증)

---

## 2. 환경변수 변경

### `.env` 파일 (`.env.example` 참고)

```bash
# ── 제거 ──────────────────────────────────────────
# MINIO_ROOT_USER=minioadmin
# MINIO_ROOT_PASSWORD=minioadmin123

# ── 추가 ──────────────────────────────────────────
AWS_ACCESS_KEY_ID=AKIA...실제키...
AWS_SECRET_ACCESS_KEY=실제시크릿키
AWS_REGION=ap-northeast-2

# ── 버킷 경로 변경 ─────────────────────────────────
BRONZE_BASE_PATH=s3a://airadar-delta/bronze
SILVER_BASE_PATH=s3a://airadar-delta/silver
```

> 버킷명(`airadar-delta`)은 실제 생성한 이름으로 변경할 것.

---

## 3. docker-compose.yml 변경

### 3-1. MinIO 서비스 제거 (또는 주석 처리)

```yaml
# 아래 두 서비스를 삭제 또는 주석 처리
# minio:
#   image: minio/minio:latest
#   ...

# minio-init:
#   image: minio/mc:latest
#   ...
```

### 3-2. spark 서비스 환경변수 수정

```yaml
spark:
  environment:
    # 변경 전
    # MINIO_ENDPOINT: http://minio:9000
    # AWS_ACCESS_KEY_ID: ${MINIO_ROOT_USER:-minioadmin}
    # AWS_SECRET_ACCESS_KEY: ${MINIO_ROOT_PASSWORD:-minioadmin123}

    # 변경 후
    AWS_ACCESS_KEY_ID: ${AWS_ACCESS_KEY_ID}
    AWS_SECRET_ACCESS_KEY: ${AWS_SECRET_ACCESS_KEY}
    AWS_REGION: ${AWS_REGION:-ap-northeast-2}
    BRONZE_BASE_PATH: ${BRONZE_BASE_PATH:-s3a://airadar-delta/bronze}
    SILVER_BASE_PATH: ${SILVER_BASE_PATH:-s3a://airadar-delta/silver}
```

### 3-3. volumes에서 minio-data 제거

```yaml
volumes:
  postgres-data:
  redis-data:
  # minio-data:  ← 삭제
```

---

## 4. Spark Job 설정 변경 (4개 파일 동일)

변경 대상 파일:
- [BronzeIngestionJob.java](../backend/src/main/java/com/mcp/airadar/spark/BronzeIngestionJob.java)
- [KafkaBronzeConsumerJob.java](../backend/src/main/java/com/mcp/airadar/spark/KafkaBronzeConsumerJob.java)
- [SilverRefinementJob.java](../backend/src/main/java/com/mcp/airadar/spark/SilverRefinementJob.java)
- [GoldServingJob.java](../backend/src/main/java/com/mcp/airadar/spark/GoldServingJob.java)

### 변경 diff

```java
// ── 변경 전 (MinIO) ──────────────────────────────
.config("spark.hadoop.fs.s3a.impl",
        "org.apache.hadoop.fs.s3a.S3AFileSystem")
.config("spark.hadoop.fs.s3a.endpoint",
        System.getenv().getOrDefault("MINIO_ENDPOINT", "http://localhost:9000"))
.config("spark.hadoop.fs.s3a.access.key",
        System.getenv().getOrDefault("AWS_ACCESS_KEY_ID", "minioadmin"))
.config("spark.hadoop.fs.s3a.secret.key",
        System.getenv().getOrDefault("AWS_SECRET_ACCESS_KEY", "minioadmin123"))
.config("spark.hadoop.fs.s3a.path.style.access", "true")        // MinIO 필수
.config("spark.hadoop.fs.s3a.connection.ssl.enabled", "false")  // HTTP
.config("spark.hadoop.fs.s3a.aws.credentials.provider",
        "org.apache.hadoop.fs.s3a.SimpleAWSCredentialsProvider")
.config("spark.hadoop.fs.s3a.fast.upload", "true")
.config("spark.hadoop.fs.s3a.multipart.size", "104857600")

// ── 변경 후 (AWS S3) ─────────────────────────────
.config("spark.hadoop.fs.s3a.impl",
        "org.apache.hadoop.fs.s3a.S3AFileSystem")
// endpoint 라인 제거 (S3 기본 엔드포인트 자동 사용)
.config("spark.hadoop.fs.s3a.access.key",
        System.getenv("AWS_ACCESS_KEY_ID"))
.config("spark.hadoop.fs.s3a.secret.key",
        System.getenv("AWS_SECRET_ACCESS_KEY"))
.config("spark.hadoop.fs.s3a.path.style.access", "false")       // S3는 virtual-hosted 방식
.config("spark.hadoop.fs.s3a.connection.ssl.enabled", "true")   // HTTPS
.config("spark.hadoop.fs.s3a.aws.credentials.provider",
        "org.apache.hadoop.fs.s3a.SimpleAWSCredentialsProvider")
.config("spark.hadoop.fs.s3a.fast.upload", "true")
.config("spark.hadoop.fs.s3a.multipart.size", "104857600")
// 리전 설정 추가
.config("spark.hadoop.fs.s3a.endpoint.region",
        System.getenv().getOrDefault("AWS_REGION", "ap-northeast-2"))
```

> **IAM Role 사용 시**: `aws.credentials.provider`를
> `com.amazonaws.auth.InstanceProfileCredentialsProvider`로 변경하면 키 없이 자동 인증된다.

---

## 5. 버킷 경로 확인

[SparkUtils.java](../backend/src/main/java/com/mcp/airadar/spark/utils/SparkUtils.java)는 환경변수만 읽으므로 코드 수정 불필요:

```java
// SparkUtils.java — 변경 불필요
public static String bronzePath(String sourceType, String date) {
    return System.getenv().getOrDefault("BRONZE_BASE_PATH", "/tmp/bronze")
        + "/" + sourceType + "/date=" + date;
}
// BRONZE_BASE_PATH=s3a://airadar-delta/bronze 로 설정하면 자동 반영
```

---

## 6. 마이그레이션 체크리스트

```
[ ] 1. AWS S3 버킷 생성 (버킷명 확정)
[ ] 2. IAM 정책 + 사용자/역할 생성 → Access Key 발급
[ ] 3. .env 파일에 AWS 자격증명 설정
[ ] 4. .env 파일에 BRONZE_BASE_PATH, SILVER_BASE_PATH 변경
[ ] 5. docker-compose.yml: minio/minio-init 서비스 제거
[ ] 6. docker-compose.yml: spark 서비스 환경변수 수정
[ ] 7. 4개 Spark Job: S3A endpoint 제거, ssl=true, path.style=false
[ ] 8. 빌드: cd AIRadar/backend && ./gradlew shadowJar
[ ] 9. 연결 테스트: 소량 데이터로 Bronze 적재 후 S3 콘솔 확인
[ ] 10. 기존 MinIO 데이터 S3로 마이그레이션 (필요 시 aws s3 sync 사용)
```

---

## 7. 기존 MinIO 데이터 마이그레이션 (선택)

기존 Bronze/Silver 데이터를 S3로 옮겨야 할 경우:

```bash
# MinIO에서 로컬로 다운로드
mc cp --recursive local/airadar/bronze ./backup/bronze
mc cp --recursive local/airadar/silver ./backup/silver

# 로컬에서 S3로 업로드
aws s3 sync ./backup/bronze s3://airadar-delta/bronze
aws s3 sync ./backup/silver s3://airadar-delta/silver
```

---

## 참고

- [minio-storage.md](../.claude/rules/minio-storage.md) — 현재 MinIO 설정 규칙
- Delta Lake는 S3 네이티브 지원 (`delta.storage.S3SingleDriverLogStore`)
- Bronze는 Immutable — 마이그레이션 후 MinIO 원본 즉시 삭제 금지 (검증 완료 후 삭제)
