# Jenkins CI/CD 초안

## 목적

- `develop` 또는 지정 브랜치를 기준으로 서버 배포 자동화
- 서버별 로컬 `.env.server1`, `.env.server2`는 유지
- Jenkins는 코드 갱신과 배포 명령만 수행

## 추가된 파일

- `Jenkinsfile`
- `AIRadar/infra/scripts/deploy-server1.sh`
- `AIRadar/infra/scripts/deploy-server2.sh`

## Jenkins 사전 준비

### Credentials

- `airadar-server1-ssh`
  - `ubuntu@j14b104.p.ssafy.io` 접속 가능한 SSH Key
- `airadar-server2-ssh`
  - `ubuntu@j14b104a.p.ssafy.io` 접속 가능한 SSH Key
- `airadar-discord-webhook-success`
  - 성공 알림용 Discord Webhook URL을 Jenkins `Secret text`로 저장
- `airadar-discord-webhook-failure`
  - 실패 알림용 Discord Webhook URL을 Jenkins `Secret text`로 저장

### Jenkins Plugins

- `SSH Agent`
- `Pipeline`
- `Git`

### Discord Webhook 설정

1. Discord 채널 설정에서 `웹후크`를 생성
2. Jenkins `Manage Jenkins > Credentials`에서 `Secret text` 추가
3. 성공용 Credential ID를 `airadar-discord-webhook-success`로 설정
4. 실패용 Credential ID를 `airadar-discord-webhook-failure`로 설정
5. 파이프라인 실행 후 성공/실패 시 Discord로 알림 수신 확인

## 배포 방식

### Server2

1. `git fetch origin`
2. `git checkout <branch>`
3. `git pull --ff-only origin <branch>`
4. `AIRadar/backend`에서 `./gradlew shadowJar`
5. `AIRadar/infra`에서 `docker-compose --env-file .env.server2 -f docker-compose.server2.yml up -d --remove-orphans`
6. `ContainerConfig` 오류가 나면 관련 컨테이너 `stop/rm` 후 재시도

### Server1

1. `git fetch origin`
2. `git checkout <branch>`
3. `git pull --ff-only origin <branch>`
4. `AIRadar/backend`에서 `./gradlew shadowJar`
5. `AIRadar/infra`에서 `docker-compose --env-file .env.server1 -f docker-compose.server1.yml up -d --remove-orphans`
6. `ContainerConfig` 오류가 나면 관련 컨테이너 `stop/rm` 후 재시도

## Jenkins 파라미터

- `DEPLOY_TARGET`
  - `server2`
  - `server1`
  - `all`
- `DEPLOY_BRANCH`
  - 기본값: `develop`

## 권장 운영 순서

1. `server2` 먼저 배포
2. `server1` 배포
3. 안정화 후 `all` 사용

## 주의사항

- 현재 서버는 `docker-compose 1.29.2`를 사용 중이라 재생성 시 `ContainerConfig` 오류가 날 수 있음
- 배포 스크립트는 1차 `up -d` 실패 시 관련 컨테이너를 정리한 뒤 자동으로 한 번 더 재시도함
- `.env.server1`, `.env.server2`는 Jenkins가 생성하거나 덮어쓰지 않음
- Discord 알림에는 Job 이름, Build 번호, 브랜치, 배포 대상, Jenkins Build URL이 포함됨
- 성공/실패 Webhook URL은 Jenkins Credential로만 관리하고 `Jenkinsfile`에 직접 넣지 않음
