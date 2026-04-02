# ARCHITECTURE NOTES

## Current Architectural Shape

RepoCouncil is a single Next.js application with:

- App Router UI pages
- Route-handler APIs
- Server-side orchestration modules
- A storage abstraction that swaps between Prisma and demo in-memory storage

This is the right MVP topology for a resource-conscious DigitalOcean deployment. It avoids unnecessary microservices and keeps orchestration, UI, and exports in one deployable unit.

## Primary Runtime Paths

### Codebase Mode

- Import path:
  - `src/app/api/repos/import/route.ts`
  - `src/server/repos/ingest.ts`
  - `src/server/repos/workspace.ts`

- Analysis path:
  - `src/app/api/analysis/start/route.ts`
  - `src/server/orchestration/run-analysis.ts`
  - `src/server/analyzers/index.ts`
  - `src/server/orchestration/graph.ts`

- Read/query path:
  - `src/server/services/queries.ts`
  - `src/app/api/analysis/[runId]/*`

### Ask Mode

- Session create/continue:
  - `src/app/api/ask/sessions/route.ts`
  - `src/app/api/ask/sessions/[sessionId]/continue/route.ts`
  - `src/server/council/run-session.ts`

- Export path:
  - `src/app/api/ask/sessions/[sessionId]/exports/route.ts`
  - `src/server/council/export.ts`

## Storage Model

### Durable

- Prisma schema is already broad enough for:
  - repositories
  - analysis runs
  - ask sessions
  - turns
  - findings
  - graph nodes/edges
  - snapshots
  - patch plans
  - exports
  - tool executions
  - model settings

### Demo

- Demo mode uses singleton in-memory bundles
- This keeps the app usable without PostgreSQL
- Current downside: it behaves too much like a mutable seeded fixture rather than isolated run storage

## Architectural Strengths

1. The storage adapter boundary is real and useful.
2. Zod contracts are used consistently enough to keep the domain coherent.
3. The orchestrators are already separated from transport concerns.
4. Deployment remains simple enough for a modest DigitalOcean droplet.

## Architectural Weak Spots

1. Analysis exports are under-modeled compared to Ask exports.
2. Recovery semantics are uneven across product modes.
3. Demo storage is not modeling realistic run isolation.
4. Very large files are starting to accumulate orchestration and UI complexity.
5. Product-level auth/security is not yet designed.

## Recommended Direction

### Keep

- Next.js App Router
- Prisma
- OpenRouter abstraction
- SSE streaming
- Single-app deployment topology

### Strengthen

- Analysis export subsystem
- Recovery/resume semantics
- Test harness
- Demo-mode correctness
- Cross-linking between graph, findings, and debate artifacts

### Defer

- Redis unless queueing/load justifies it
- Microservice split
- Kubernetes
- CodeQL unless feature-flagged and operator-enabled

## Design Principles For The Next Iteration

1. Prefer safe, reviewable improvements over broad rewrites.
2. Persist canonical state once and derive exports from it.
3. Keep demo mode useful, but do not let it distort runtime correctness.
4. Add tests around workflows before adding more speculative product surface.
5. Preserve the current distinct visual identity while improving capability depth.

