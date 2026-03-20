#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
INFRA_DIR="${REPO_ROOT}/infra"
JAR_PATH="${REPO_ROOT}/backend/build/libs/airadar-spark.jar"
JAR_BACKUP="${JAR_PATH}.backup"

if sudo -n true >/dev/null 2>&1; then
  SUDO="sudo -n"
elif [ "$(id -u)" -eq 0 ]; then
  SUDO=""
else
  SUDO="sudo"
fi

cd "${INFRA_DIR}"

if [ ! -f ".env.server2" ]; then
  echo "[ERROR] .env.server2 not found in ${INFRA_DIR}. Aborting deployment."
  exit 1
fi

${SUDO} docker-compose --env-file .env.server2 -f docker-compose.server2.yml config >/dev/null

run_compose() {
  ${SUDO} docker-compose --env-file .env.server2 -f docker-compose.server2.yml "$@"
}

cleanup_and_retry() {
  # postgres/redis는 stateful 서비스 — 배포 중 재시작 금지 (Airflow heartbeat 실패 유발)
  run_compose stop postgres-init ai-server backend frontend kafka-ui pgadmin redis-insight spark-worker2 || true
  run_compose rm -f postgres-init ai-server backend frontend kafka-ui pgadmin redis-insight spark-worker2 || true
  run_compose up -d --remove-orphans
}

rollback() {
  echo "[Rollback] Restoring previous JAR..."
  if [ -f "${JAR_BACKUP}" ]; then
    cp "${JAR_BACKUP}" "${JAR_PATH}"
    echo "[Rollback] JAR restored from backup."
  else
    echo "[Rollback] No backup found, skipping JAR restore."
  fi

  cd "${INFRA_DIR}"
  ${SUDO} docker-compose --env-file .env.server2 -f docker-compose.server2.yml config >/dev/null
  cleanup_and_retry
  echo "[Rollback] Server2 restarted with previous version."
}

if [ "${1:-}" = "--rollback" ]; then
  rollback
  exit 0
fi

if [ -f "${JAR_PATH}" ]; then
  cp "${JAR_PATH}" "${JAR_BACKUP}"
  echo "[Deploy] JAR backed up to ${JAR_BACKUP}"
fi

cd "${INFRA_DIR}"
${SUDO} docker-compose --env-file .env.server2 -f docker-compose.server2.yml config >/dev/null

run_compose build --no-cache backend frontend

# build 후 명시적으로 stop → rm → up (up -d만으로는 이미지 교체가 보장되지 않음)
run_compose stop backend frontend ai-server spark-worker2 || true
run_compose rm -f backend frontend ai-server spark-worker2 || true

if ! run_compose up -d --remove-orphans; then
  cleanup_and_retry
fi

echo "[Deploy] Server2 deployment complete."
