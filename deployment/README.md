# DigitalOcean Deployment Guide

This project now supports both DigitalOcean App Platform and a modest self-managed Droplet. In both cases, the repo-root `Dockerfile` and `deployment/scripts/start.sh` are the source of truth for runtime preflight checks, schema sync, recovery, and process startup.

## Recommended footprints

### App Platform

- `apps-s-1vcpu-1gb` works for the current resource-aware Ask/Council defaults
- keep `ANALYSIS_MAX_CONCURRENCY=1`
- keep `ASK_MAX_CONCURRENCY=1`
- keep `ASK_MAX_ACTIVE_AGENTS=2`
- keep `ASK_MAX_PARTICIPANTS=6`

### Droplet

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
- `ASK_MAX_CONCURRENCY`
- `ASK_MAX_ACTIVE_AGENTS`
- `ASK_MAX_PARTICIPANTS`
- `NODE_OPTIONS`
- `LOG_LEVEL`
- `ENABLE_SEMGREP`
- `ENABLE_CODEQL`
- `RUN_DB_PUSH_ON_START`
- `DB_CONNECT_MAX_RETRIES`
- `RECOVER_RUNNING_RUNS_ON_START`

## App Platform workflow

The included [`.do/app.yaml`](../.do/app.yaml) is configured for the current production path:

- App Platform builds from the repo-root `Dockerfile`
- the container listens on port `3000`
- runtime startup goes through `deployment/scripts/start.sh`
- health checks use `/api/health`
- Ask/Council agent limits default to a staged, resource-aware profile

Recommended App Platform setup:

1. Create or update the app from [`.do/app.yaml`](../.do/app.yaml).
2. Set these encrypted runtime variables in the App Platform UI or spec:
   - `DATABASE_URL`
   - `OPENROUTER_API_KEY` if you want live model calls instead of heuristic fallbacks
3. Keep `NEXT_PUBLIC_APP_URL` bound to `${APP_URL}` in the spec so the deployed hostname stays accurate.
4. If you need more throughput, scale instance size first, then raise Ask or analysis concurrency deliberately.

Runtime behavior on App Platform:

- `deployment/scripts/preflight.mjs` validates required env vars and Ask capacity knobs
- `deployment/scripts/start.sh` runs `prisma db push --skip-generate` when `RUN_DB_PUSH_ON_START=true`
- running or interrupted analyses are recovered on boot when `RECOVER_RUNNING_RUNS_ON_START=true`
- Ask sessions persist through the database-backed storage layer, not just in memory

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
- `ASK_MAX_CONCURRENCY=1`
- `ASK_MAX_ACTIVE_AGENTS=2`
- `ASK_MAX_PARTICIPANTS=6`
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
- invalid Ask capacity config, such as `ASK_MAX_ACTIVE_AGENTS` being greater than `ASK_MAX_PARTICIPANTS`

### App Platform deploy is healthy at build time but fails after release

Check the runtime logs in App Platform rather than the build logs. A successful Docker build does not confirm the app passed preflight or schema sync.

Common causes:

- `NEXT_PUBLIC_APP_URL` not bound to the deployed hostname
- `DATABASE_URL` missing or unreachable at runtime
- `RUN_DB_PUSH_ON_START=true` with a database user that cannot update schema objects
- health checks starting before the app has completed schema sync on a cold deploy

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
