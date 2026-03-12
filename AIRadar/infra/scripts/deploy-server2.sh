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
${SUDO} docker-compose --env-file .env.server2 -f docker-compose.server2.yml config >/dev/null

run_compose() {
  ${SUDO} docker-compose --env-file .env.server2 -f docker-compose.server2.yml "$@"
}

cleanup_and_retry() {
  run_compose stop postgres postgres-init redis ai-server backend frontend kafka-ui pgadmin redis-insight spark-worker2 || true
  run_compose rm -f postgres postgres-init redis ai-server backend frontend kafka-ui pgadmin redis-insight spark-worker2 || true
  run_compose up -d --remove-orphans
}

if ! run_compose up -d --remove-orphans; then
  cleanup_and_retry
fi
