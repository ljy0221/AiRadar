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

run_compose() {
  ${SUDO} docker-compose --env-file .env.server2 -f docker-compose.server2.yml "$@"
}

cleanup_and_retry() {
  run_compose stop postgres postgres-init redis ai-server backend frontend kafka-ui pgadmin redis-insight spark-worker2 || true
  run_compose rm -f postgres postgres-init redis ai-server backend frontend kafka-ui pgadmin redis-insight spark-worker2 || true
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

if ! run_compose up -d --remove-orphans; then
  cleanup_and_retry
fi

echo "[Deploy] Server2 deployment complete."
