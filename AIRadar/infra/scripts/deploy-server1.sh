#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
INFRA_DIR="${REPO_ROOT}/infra"
JAR_PATH="${REPO_ROOT}/backend/build/libs/airadar-spark.jar"
JAR_BACKUP="${JAR_PATH}.backup"

rollback() {
  echo "[Rollback] Restoring previous JAR..."
  if [ -f "${JAR_BACKUP}" ]; then
    cp "${JAR_BACKUP}" "${JAR_PATH}"
    echo "[Rollback] JAR restored."
  else
    echo "[Rollback] No backup found, skipping JAR restore."
  fi
}

if [ "${1:-}" = "--rollback" ]; then
  rollback
  exit 0
fi

if [ ! -f "${JAR_PATH}" ]; then
  echo "[Deploy] JAR not found, building..."
  cd "${REPO_ROOT}/backend" && ./gradlew shadowJar
fi

cp "${JAR_PATH}" "${JAR_BACKUP}"
echo "[Deploy] JAR backed up to ${JAR_BACKUP}"

# crawler 재빌드 및 재시작
echo "[Deploy] Rebuilding crawler..."
cd "${INFRA_DIR}"
docker compose -f docker-compose.server1.yml up -d --build --no-deps crawler

echo "[Deploy] Server1 deployment complete."