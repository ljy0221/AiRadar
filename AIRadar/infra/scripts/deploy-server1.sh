#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
INFRA_DIR="${REPO_ROOT}/infra"

if sudo -n true >/dev/null 2>&1; then
  SUDO="sudo -n"
elif [ "$(id -u)" -eq 0 ]; then
  SUDO=""
else
  SUDO="sudo"
fi

cd "${INFRA_DIR}"

if [ ! -f ".env.server1" ]; then
  echo "[ERROR] .env.server1 not found in ${INFRA_DIR}. Aborting deployment."
  exit 1
fi

${SUDO} docker-compose --env-file .env.server1 -f docker-compose.server1.yml config >/dev/null

run_compose() {
  ${SUDO} docker-compose --env-file .env.server1 -f docker-compose.server1.yml "$@"
}

cleanup_and_retry() {
  run_compose stop kafka zookeeper spark-master spark-worker1 airflow crawler || true
  run_compose rm -f kafka zookeeper spark-master spark-worker1 airflow crawler || true
  run_compose up -d --remove-orphans
}

if ! run_compose up -d --remove-orphans; then
  cleanup_and_retry
fi
