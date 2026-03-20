#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
JAR_PATH="${REPO_ROOT}/backend/build/libs/airadar-spark.jar"
JAR_BACKUP="${JAR_PATH}.backup"

rollback() {
  echo "[Rollback] Restoring previous JAR..."
  if [ -f "${JAR_BACKUP}" ]; then
    cp "${JAR_BACKUP}" "${JAR_PATH}"
    echo "[Rollback] JAR restored. 다음 Job 실행 시 이전 버전이 적용됩니다."
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

echo "[Deploy] JAR 교체 완료. 다음 Job 실행 시 새 JAR이 자동으로 적용됩니다."
echo "[Deploy] Server1 deployment complete."
