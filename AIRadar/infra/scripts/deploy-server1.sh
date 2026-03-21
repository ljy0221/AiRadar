#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
JAR_PATH="${REPO_ROOT}/backend/build/libs/airadar-spark.jar"
JAR_BACKUP="${JAR_PATH}.backup"

if sudo -n true >/dev/null 2>&1; then
  SUDO="sudo -n"
elif [ "$(id -u)" -eq 0 ]; then
  SUDO=""
else
  SUDO="sudo"
fi

INFRA_DIR="${REPO_ROOT}/infra"

run_compose() {
  ${SUDO} docker-compose --env-file .env.server1 -f docker-compose.server1.yml "$@"
}

cleanup_and_retry() {
  run_compose stop kafka zookeeper spark-master spark-worker1 airflow crawler || true
  run_compose rm -f kafka zookeeper spark-master spark-worker1 airflow crawler || true
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
  ${SUDO} docker-compose --env-file .env.server1 -f docker-compose.server1.yml config >/dev/null
  cleanup_and_retry
  echo "[Rollback] Server1 restarted with previous version."
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
if [ ! -f ".env.server1" ]; then
  echo "[ERROR] .env.server1 not found in ${INFRA_DIR}. Aborting deployment."
  exit 1
fi

run_compose build --build-arg CACHEBUST="$(date +%s)" crawler

if ! run_compose up -d --no-deps --force-recreate crawler airflow spark-master spark-worker1; then
  cleanup_and_retry
fi

echo "[Deploy] Server1 deployment complete."
