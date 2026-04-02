# DigitalOcean Deployment Guide

This project is structured for a modest DigitalOcean Droplet first, with a future path to App Platform later.

## Recommended MVP server

- 2 vCPU / 4 GB RAM Droplet for the first production deployment
- Ubuntu 24.04 LTS
- Docker Engine + Docker Compose plugin
- DigitalOcean Managed PostgreSQL preferred for production

For a smaller smoke-test environment, 1 vCPU / 2 GB RAM can work, but analysis throughput and build headroom will be tighter.

## Deployment artifacts included

- `Dockerfile`
- `.dockerignore`
- `docker-compose.yml`
- `docker-compose.prod.yml`
- `.env.example`
- `deployment/scripts/start.sh`
- `deployment/scripts/preflight.mjs`
- `deployment/scripts/healthcheck.mjs`
- `deployment/scripts/recover-runs.mjs`
- `deployment/scripts/post-deploy-check.sh`
- `deployment/scripts/verify-deployed-analysis.mjs`

## Environment variables

Required for production:

- `NEXT_PUBLIC_APP_URL`
- `DATABASE_URL` when `DEMO_MODE=false`

Optional but recommended:

- `OPENROUTER_API_KEY`
- `REDIS_URL`
- `REPO_STORAGE_ROOT`
- `EXPORT_STORAGE_ROOT`
- `ANALYSIS_MAX_CONCURRENCY`
- `NODE_OPTIONS`
- `LOG_LEVEL`
- `ENABLE_SEMGREP`
- `ENABLE_CODEQL`
- `RUN_DB_PUSH_ON_START`
- `DB_CONNECT_MAX_RETRIES`
- `RECOVER_RUNNING_RUNS_ON_START`

## Local container workflow

1. Copy the env file:

```bash
cp .env.example .env
```

2. Start the app with the bundled local PostgreSQL profile:

```bash
docker compose --profile local up --build
```

3. Verify service health:

```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/ready
```

## Production Droplet workflow

1. Provision a Droplet and install Docker:

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"
newgrp docker
docker --version
docker compose version
```

2. Clone the repository onto the Droplet:

```bash
git clone https://github.com/MrinallSamal-byte/Codex_Council.git
cd Codex_Council
```

3. Create the production env file:

```bash
cp .env.example .env
```

Set at minimum:

- `NEXT_PUBLIC_APP_URL=https://your-domain-or-ip`
- `DATABASE_URL=postgresql://...`
- `DEMO_MODE=false`
- `ANALYSIS_MAX_CONCURRENCY=1`
- `NODE_OPTIONS=--max-old-space-size=768`
- `RUN_DB_PUSH_ON_START=true`

4. Build and start the containerized app:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

5. Verify health/readiness:

```bash
curl http://127.0.0.1:${APP_PORT:-3000}/api/health
curl http://127.0.0.1:${APP_PORT:-3000}/api/ready
```

## Managed PostgreSQL notes

This app works cleanly with a managed `DATABASE_URL`. Production should prefer DigitalOcean Managed PostgreSQL over the bundled local Compose database.

Switching from local DB to managed DB:

1. Stop using the local `db` profile.
2. Set `DATABASE_URL` to the managed cluster URL.
3. Keep `RUN_DB_PUSH_ON_START=true` for the current MVP schema-sync strategy.
4. Restart the app container.

## Migration strategy

Current production-safe MVP strategy:

- startup runs `prisma db push --skip-generate`
- the startup script retries schema sync with bounded backoff

Commands:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm app npx prisma db push --skip-generate
docker compose -f docker-compose.yml -f docker-compose.prod.yml restart app
```

When formal Prisma migrations are added later, switch startup from `db push` to `prisma migrate deploy`.

## Rollback and restart

Restart only:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml restart app
```

Rebuild after code changes:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Rollback to previous image tag if you are tagging images:

```bash
docker image ls repocouncil
docker compose -f docker-compose.yml -f docker-compose.prod.yml down
# edit image tag if needed
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## Operational behavior

- health endpoint: `/api/health`
- readiness endpoint: `/api/ready`
- analysis status endpoint: `/api/analysis/:runId/status`
- startup validation fails fast on missing required runtime config
- markdown exports are persisted under `EXPORT_STORAGE_ROOT/<run-id>/`
- running or pending analyses are marked as interrupted-on-restart in the database summary and surfaced as failed/recoverable

## Troubleshooting

### Container exits immediately

Check:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs app
```

Common causes:

- invalid `NEXT_PUBLIC_APP_URL`
- missing `DATABASE_URL` while `DEMO_MODE=false`
- PostgreSQL not reachable from the Droplet

### Readiness fails

Check database connectivity and credentials:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec app node deployment/scripts/healthcheck.mjs
curl http://127.0.0.1:${APP_PORT:-3000}/api/ready
```

### Schema sync keeps retrying

- verify the managed PostgreSQL cluster allows connections from the Droplet IP
- verify SSL parameters in `DATABASE_URL`
- verify the database user can create/update tables in the target schema

## Post-deploy smoke checks

Run:

```bash
sh deployment/scripts/post-deploy-check.sh https://your-domain-or-ip
```

If you have a run id from a completed analysis:

```bash
RUN_ID=your-run-id sh deployment/scripts/post-deploy-check.sh https://your-domain-or-ip
```

Manual checklist:

- app root loads
- dashboard loads
- health returns 200
- readiness returns 200
- static assets load
- repo import works
- analysis starts
- debate stream updates appear
- report export downloads
- refresh and resume still work

Automated flow verification from the running app container:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec app \
  node deployment/scripts/verify-deployed-analysis.mjs http://127.0.0.1:3000
```

That script verifies:

- demo repo import
- live SSE debate/progress streaming
- analysis completion with persisted snapshots
- markdown report download and on-disk export artifact creation
- resume from a synthetic persisted checkpoint
