#!/bin/sh
set -eu

BASE_URL="${1:-}"
RUN_ID="${RUN_ID:-}"

if [ -z "$BASE_URL" ]; then
  echo "Usage: $0 <base-url>" >&2
  echo "Example: $0 https://repocouncil.example.com" >&2
  exit 1
fi

echo "Checking app root..."
curl -fsS "$BASE_URL/" >/dev/null

echo "Checking dashboard..."
curl -fsS "$BASE_URL/dashboard" >/dev/null

echo "Checking health..."
curl -fsS "$BASE_URL/api/health" | grep '"status":"ok"' >/dev/null

echo "Checking readiness..."
curl -fsS "$BASE_URL/api/ready" >/dev/null

if [ -n "$RUN_ID" ]; then
  echo "Checking analysis status for run ${RUN_ID}..."
  curl -fsS "$BASE_URL/api/analysis/$RUN_ID/status" >/dev/null

  echo "Checking markdown report for run ${RUN_ID}..."
  curl -fsS "$BASE_URL/api/analysis/$RUN_ID/report?download=true" >/dev/null
else
  echo "RUN_ID not provided. Skipping analysis/export-specific checks."
fi

echo "Post-deploy checks passed."
