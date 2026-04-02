# PROJECT STATUS REPORT

## 1. Executive Summary

RepoCouncil is already a substantial Next.js MVP rather than a blank scaffold. The repository contains:

- A dual-mode product surface for Codebase Analysis and Ask / Council mode
- A typed server layer for repo ingestion, analyzers, multi-agent orchestration, OpenRouter routing, storage adapters, and exports
- A Prisma schema for durable runs, ask sessions, findings, graph entities, patch plans, and model settings
- A presentable UI with a distinct landing page, dashboard, graph view, debate view, findings pages, exports page, and Ask Mode workspace
- Docker and DigitalOcean deployment assets

Current maturity is "working MVP with clear unfinished edges", not "production-complete product". The codebase builds and runs, but several requested requirements are still only partially met:

- Runtime checks pass for lint, type-check, and build
- End-to-end smoke execution is possible in demo mode
- Some core behaviors are still MVP-thin or incomplete
- Test coverage is effectively absent
- Analysis exports are incomplete relative to the product spec
- Recovery/resume handling is stronger for analysis runs than for Ask sessions
- Demo storage leaks seeded state into newly started runs

## 2. What The Project Currently Is

RepoCouncil is a Next.js App Router application for:

- Importing a repo from GitHub, demo seed, or uploaded zip
- Running a static-analysis pass plus a six-role codebase debate
- Persisting analysis bundles via Prisma or a demo-backed in-memory adapter
- Rendering findings, architecture graph, debate state, patch plans, and a markdown report
- Running Ask / Council sessions with configurable mode, agent count, strategy, and answer style
- Exporting Ask sessions in markdown, transcript, JSON, PDF, and ZIP

The overall product direction is aligned with the requested mission. The gap is that some areas are still "MVP surface present" rather than "fully realized and hardened".

## 3. Current Maturity

Assessment: mid-stage MVP.

What is solid:

- Core routing and UI skeleton are present
- Contracts are strongly typed with Zod
- Build and type system are healthy
- Repo ingestion, analyzer suite, debate orchestration, and SSE streaming exist
- Docker-first deployment path exists

What is still immature:

- Critical flow verification is mostly manual
- Export system for analysis mode is materially underbuilt
- Some endpoints are intentionally skeletal
- Recovery behavior is asymmetric between analysis and Ask Mode
- Demo mode state management has correctness bugs
- No real automated regression protection exists

## 4. Major Modules / Folders

- `src/app`
  App Router pages and API routes for dashboard, codebase views, Ask Mode, health/readiness, repo import, analysis runs, and exports.

- `src/components`
  UI for landing, dashboard, council workspace, debate timeline, graph view, findings tables, patches, settings, and design primitives.

- `src/lib/contracts`
  Zod schemas and domain/API contracts for repositories, runs, findings, graph entities, ask sessions, exports, and agent outputs.

- `src/server/analyzers`
  Repo crawl, framework detection, route extraction, import graph extraction, TODO finder, test-presence analyzer, package audit, and Semgrep adapter.

- `src/server/orchestration`
  Analysis workflow, state graph, progress bus, concurrency guards, graph workflow, and identity helpers.

- `src/server/council`
  Ask / Council role selection, prompt generation, session execution, and Ask export generation.

- `src/server/agents`
  Codebase debate prompts and agent execution wrapper with OpenRouter fallback behavior.

- `src/server/db`
  Prisma-backed durable adapter plus demo-backed in-memory adapter.

- `src/server/repos`
  GitHub archive import, zip extraction, workspace creation, and repo lookup helpers.

- `prisma`
  Schema and seed path.

- `deployment`
  Startup, preflight, healthcheck, post-deploy, verification, and interrupted-run recovery scripts.

## 5. Architecture And Data Flow

### Codebase Mode

1. UI imports a repository through `/api/repos/import`.
2. Imported repo metadata is stored with a workspace path.
3. UI starts a run via `/api/analysis/start`.
4. `src/server/orchestration/run-analysis.ts` creates the run, persists default model settings, and triggers background execution.
5. `runAnalyzerSuite()` collects file tree, framework, import graph, routes, TODOs, test presence, package audit, and Semgrep state.
6. Graph, findings, and tool outputs are stored.
7. Multi-agent debate runs in the order Scout -> Architect -> Security -> Implementation -> Product -> Judge.
8. Findings, feature suggestions, patch plans, snapshots, and a markdown report are persisted.
9. UI pages read the bundle and subscribe over SSE.

### Ask Mode

1. UI posts to `/api/ask/sessions`.
2. `src/server/council/run-session.ts` normalizes the plan, assigns roles/models, and runs rounds.
3. Turns are appended to storage as they complete.
4. Final answer and canonical summary are persisted to the session.
5. Ask exports are generated lazily from persisted state.

### Storage

- Durable mode: Prisma + PostgreSQL
- Demo mode: in-memory singleton storage

### Model Layer

- OpenRouter via the OpenAI SDK wrapper in `src/server/models/openrouter.ts`
- Fallback to heuristic outputs when OpenRouter is unavailable

## 6. Current Feature Status

### Implemented / Mostly Implemented

- Landing page with two-path positioning
- Dashboard, architecture, debate, security, gaps, features, patches, exports, report, settings, ask/council pages
- Repo import from GitHub, demo, and zip upload
- Static analyzer suite
- Multi-agent codebase debate
- Ask Mode with agent count, mode, model strategy, answer style, and priority controls
- SSE progress updates
- React Flow graph rendering
- Ask Mode export generation
- Health/readiness endpoints
- Docker and DigitalOcean deployment assets

### Partially Implemented

- Analysis export center
  Only markdown report is first-class; requested broader export set is missing.

- Resume and recovery
  Analysis resume exists. Ask Mode has continue/rerun, but not equivalent restart recovery handling.

- Model/provider transparency
  Present in UI and stored metadata, but analysis-turn persistence does not yet store a fully explicit "requested vs actual" model shape in first-class schema fields.

- Analyzer rerun
  Endpoint exists but is currently a queued/latest-state stub in `src/app/api/analysis/[runId]/analyzers/[analyzer]/rerun/route.ts`.

- Debate quality without OpenRouter
  Functional, but heuristic Ask outputs are generic and repetitive.

### Missing

- Automated test harness and meaningful regression coverage
- Full analysis export bundle in all requested formats
- Export history surface for prior analysis artifacts
- Ask session restart recovery parity
- Stronger cross-linking between graph, findings, debate, and patch plans
- Production authn/authz for the product itself
- Rate limiting / abuse protection for imports and session creation

## 7. Runnability / Lint / Type-Check / Build / Tests Status

Validation performed locally:

- `npm run lint`: passes
- `npm run typecheck`: passes
- `npm run build`: passes

Runtime verification performed locally against a started server:

- `/api/health`: works
- `/api/ready`: works
- `/api/repos`: works
- Demo repo import: works
- Analysis start and completion: works
- Ask session creation and completion: works

Tests:

- No real automated test suite is currently present
- No `test` script exists in `package.json`
- No integration, UI, or E2E coverage exists

## 8. Bugs / Gaps / Incomplete Areas

### Confirmed Runtime Bug

1. Demo analysis runs inherit stale seeded state instead of starting clean.

Evidence:

- `src/server/db/demo-storage.ts:createAnalysisRun()` updates `bundle.run` but does not reset `turns`, `reports`, `snapshots`, `findings`, `patches`, `features`, or `tools`.
- Runtime verification showed a fresh demo run returning `12` turns and `2` reports, which includes stale seeded records.

### Confirmed Product Gaps

2. Analysis export system is materially incomplete.

Evidence:

- `src/server/report/export.ts` only builds markdown artifacts.
- `src/app/api/analysis/[runId]/report/route.ts` only supports markdown JSON/download handling.
- `src/app/exports/page.tsx` only exposes one analysis markdown export.

3. Ask restart recovery is incomplete.

Evidence:

- `deployment/scripts/recover-runs.mjs` handles only `analysisRun`, not `askSession`.
- There is no Ask resume endpoint equivalent to `/api/analysis/[runId]/resume`.

4. Analyzer rerun endpoint is a stub.

Evidence:

- `src/app/api/analysis/[runId]/analyzers/[analyzer]/rerun/route.ts` returns queued/latest-state behavior with an explicit MVP disclaimer.

5. Test coverage is missing entirely.

Evidence:

- No test runner is configured in `package.json`
- No integration/UI/E2E test files are present beyond the analyzer that detects test absence

6. Analysis report storage and export model is underpowered.

Evidence:

- Prisma only stores `ExportReport` records, not a richer export artifact/bundle history model.
- UI has no analysis export history listing.

7. Demo storage only supports one mutable analysis bundle and one mutable repo.

Evidence:

- `src/server/db/demo-storage.ts` maintains a single global bundle rather than realistic multi-run isolation.

## 9. Security Findings

### Product-Level Security Risks

1. No auth or authorization layer protects the RepoCouncil app itself.

Evidence:

- All app routes and API routes are publicly callable in the current codebase.
- No auth middleware, session enforcement, or user model exists for the platform.

2. Zip import lacks explicit upload size or file-count limits.

Evidence:

- `src/app/api/repos/import/route.ts` accepts any uploaded file named `archive`.
- `src/server/repos/workspace.ts` extracts every zip entry without explicit size thresholds.

3. GitHub import and session creation have no rate limiting.

Evidence:

- No request throttling, IP controls, or abuse guards exist on import/session endpoints.

4. Export routes have no access control.

Evidence:

- Analysis and Ask exports are available solely by run/session id.

5. Product recovery behavior could expose stale or misleading states after restart.

Evidence:

- Analysis recovery marks runs failed/recoverable.
- Ask sessions currently lack equivalent recovery, so restart semantics are incomplete.

### Repo Analysis Security Notes

- The analyzer suite can surface security findings for imported repos.
- Semgrep support is optional and disabled without the binary.
- The current analyzer set does not yet provide deep authz/path sensitivity analysis.

## 10. Maintainability Review

Positives:

- Good use of TypeScript and Zod contracts
- Server responsibilities are split into analyzers, orchestration, storage, repos, and exports
- Next.js App Router structure is clean
- Deployment assets are already organized

Concerns:

1. Some files are too large and carry too many responsibilities.

Examples:

- `src/components/council/council-workspace.tsx`
- `src/server/council/run-session.ts`
- `src/server/db/prisma-storage.ts`

2. Demo data and demo behavior are tightly interwoven with runtime logic.

3. Export behavior is split across multiple places and currently uneven between analysis and Ask Mode.

4. Some metadata is stored in generic JSON blobs where first-class fields would be easier to reason about.

5. Several important behaviors are only indirectly verified through manual smoke runs.

## 11. Product Readiness Review

The app is good enough for a convincing local MVP demo and can be deployed in a constrained environment. It is not yet at the requested "strong MVP / production-ready intelligence platform" bar.

Why:

- Core UX is present and differentiated
- Runtime startup and deployment path are credible
- Primary flows work in demo mode
- Missing export breadth, recovery parity, and test coverage keep it from being truly production-ready

## 12. Top 10 Missing Pieces Before Strong MVP

1. Fix demo run isolation so fresh runs do not inherit stale seeded state.
2. Build a first-class analysis export system for Markdown, JSON, CSV, Mermaid, PDF, and ZIP.
3. Add export history and re-export support for analysis runs.
4. Add automated integration/UI/E2E coverage for import, analysis, Ask Mode, exports, and failure recovery.
5. Add Ask session restart recovery and explicit resumability semantics.
6. Replace or improve the analyzer rerun stub with real rerun behavior.
7. Improve graph-to-finding / debate / patch cross-highlighting and selection state.
8. Add product-level authn/authz or clearly document single-user/internal-only assumptions.
9. Add upload/import safety limits and rate limiting.
10. Improve heuristic Ask-mode fallback quality when live models are unavailable.

## 13. Recommended Next Plan

Immediate execution priority:

1. Fix demo storage correctness and restart recovery gaps.
2. Implement the missing analysis export system and export-center UI improvements.
3. Add tests around import, analysis, Ask Mode, exports, and recovery.
4. Tighten runtime documentation and deployment verification.

Secondary priority:

5. Improve graph/finding/debate linkage interactions.
6. Replace analyzer rerun stub with a real rerun path.
7. Add security hardening for uploads, exports, and public endpoints.

## 14. Immediate Blockers

1. Demo-mode analysis state leakage
2. Missing automated test harness
3. Incomplete analysis exports and export-center coverage
4. Ask restart recovery gap
5. Analyzer rerun still stubbed

