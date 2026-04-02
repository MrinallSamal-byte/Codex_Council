#!/bin/sh
set -eu

node deployment/scripts/preflight.mjs

mkdir -p "${REPO_STORAGE_ROOT:-/var/lib/repocouncil/workspaces}"
mkdir -p "${EXPORT_STORAGE_ROOT:-/var/lib/repocouncil/exports}"

if [ "${RUN_DB_PUSH_ON_START:-true}" = "true" ] && [ -n "${DATABASE_URL:-}" ]; then
  attempt=1
  max_attempts="${DB_CONNECT_MAX_RETRIES:-10}"

  until npx prisma db push --skip-generate; do
    if [ "$attempt" -ge "$max_attempts" ]; then
      echo "Prisma schema sync failed after ${max_attempts} attempts." >&2
      exit 1
    fi

    sleep_seconds="$attempt"
    if [ "$sleep_seconds" -gt 5 ]; then
      sleep_seconds=5
    fi

    echo "Retrying Prisma schema sync in ${sleep_seconds}s (${attempt}/${max_attempts})..." >&2
    attempt=$((attempt + 1))
    sleep "$sleep_seconds"
  done
fi

if [ "${RECOVER_RUNNING_RUNS_ON_START:-true}" = "true" ] && [ -n "${DATABASE_URL:-}" ]; then
  node deployment/scripts/recover-runs.mjs
fi

if [ -f "./server.js" ]; then
  exec node server.js
fi

if [ -f "./.next/standalone/server.js" ]; then
  exec node .next/standalone/server.js
fi

exec node_modules/.bin/next start --hostname "${HOSTNAME:-0.0.0.0}" --port "${PORT:-3000}"
