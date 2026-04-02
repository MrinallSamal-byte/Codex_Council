# RepoCouncil

RepoCouncil is a production-oriented MVP for repository intelligence. It imports a repository, crawls and maps the architecture, runs a structured multi-agent audit with durable memory, and renders a live engineering dashboard with graph, findings, debate state, patch plans, and exportable reports.

## What the MVP includes

- Next.js App Router application in TypeScript
- Tailwind CSS + shadcn-style UI primitives
- Prisma schema for PostgreSQL-backed durable state
- OpenRouter model router with structured JSON output handling and fallbacks
- LangGraph orchestration skeleton for Scout, Architect, Security, Implementation, Product, and Judge agents
- JS/TS repository analyzers for file crawl, framework detection, imports, route discovery, TODOs, test presence, Semgrep availability, and lightweight dependency audit
- Public GitHub repository ingestion using GitHub's archive API, so deployed environments do not need a runtime `git clone`
- React Flow architecture view
- TanStack Table findings views
- Monaco patch preview
- Recharts severity chart
- SSE progress streaming
- Demo repository snapshot and seeded demo bundle

## Runtime note

The requested target stack was the latest stable Next.js, but this workspace currently runs on Node `18.19.0`. The implementation is pinned to Next `15.5.x` and Prisma `6.19.x` so the MVP remains runnable here. Moving to Node `20+` is still recommended for future upgrades.

## Environment

Copy `.env.example` to `.env.local` and adjust values.

```bash
cp .env.example .env.local
```

Required for full persistence:

- `DATABASE_URL`: PostgreSQL connection string

Optional:

- `OPENROUTER_API_KEY`: enables live model calls through OpenRouter
- `NEXT_PUBLIC_APP_URL`: defaults to `http://localhost:3000`
- `REPO_STORAGE_ROOT`: defaults to `.repocouncil/workspaces` locally and `/tmp/repocouncil/workspaces` in production
- `EXPORT_STORAGE_ROOT`: defaults to `.repocouncil/exports` locally and `/tmp/repocouncil/exports` in production
- `ANALYSIS_MAX_CONCURRENCY`: defaults to `1` for modest cloud instances
- `NODE_OPTIONS`: defaults to `--max-old-space-size=768` in the provided container configs
- `ENABLE_SEMGREP=true`: enables Semgrep adapter if the `semgrep` binary is installed
- `DEMO_MODE=false`: disables demo defaults

If `DATABASE_URL` is absent, the app falls back to a demo-backed in-process adapter so the UI still works. Durable memory guarantees require PostgreSQL mode.

## Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Database

Generate the Prisma client:

```bash
npm run db:generate
```

Push the schema to a connected PostgreSQL database:

```bash
npm run db:push
```

Seed the demo bundle into PostgreSQL:

```bash
npm run seed
```

## Product flow

1. Import a public GitHub repository or upload a local zip snapshot.
2. Start analysis.
3. Watch the graph and progress stream.
4. Review findings in `Security`, `Gaps`, and `Patches`.
5. Inspect durable multi-agent turns in `Debate`.
6. Export the final report from `Report`.

## DigitalOcean App Platform

The repo includes a starter App Platform spec at `.do/app.yaml`.

Recommended App Platform environment variables:

- `DATABASE_URL` as a secret with `RUN_AND_BUILD_TIME` scope
- `OPENROUTER_API_KEY` as a secret with `RUN_TIME` scope if you want live model calls
- `NEXT_PUBLIC_APP_URL` set to your DigitalOcean app URL or custom domain
- `DEMO_MODE=false`

The included build command keeps deployments safe in both cases:

- if `DATABASE_URL` is configured, it runs `prisma db push` before `next build`
- if `DATABASE_URL` is missing, it skips schema sync and the app falls back to demo-backed storage

## Architecture overview

- `src/app`: UI routes and API routes
- `src/components`: reusable dashboard, graph, findings, and settings components
- `src/lib/contracts`: Zod schemas for domain and API contracts
- `src/server/analyzers`: pluggable analyzer adapters
- `src/server/orchestration`: progress bus, LangGraph state graph, and analysis runner
- `src/server/db`: storage adapters for Prisma and demo mode
- `src/server/repos`: ingestion and workspace management
- `sample-repos/demo-commerce`: bundled demo repository used by the MVP

## Current tradeoffs

- Redis and CodeQL are not required in the MVP
- Private GitHub auth is not implemented yet
- The analyzer rerun endpoint is present but still returns queued/latest-state behavior
- LangGraph state is persisted through explicit storage snapshots rather than a dedicated LangGraph DB checkpointer package

## Verification

Recommended local checks:

```bash
npm run lint
npm run typecheck
npm run build
```

Production-style runtime checks:

```bash
sh deployment/scripts/post-deploy-check.sh http://127.0.0.1:3000
node deployment/scripts/verify-deployed-analysis.mjs http://127.0.0.1:3000
```
