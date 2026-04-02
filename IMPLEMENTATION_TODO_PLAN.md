# IMPLEMENTATION TODO PLAN

## Phase A: Completed Analysis Baseline

- Audit repo structure, routes, storage, analyzers, Ask Mode, exports, and deployment assets
- Run `lint`, `typecheck`, `build`
- Perform local runtime smoke checks
- Record findings in `PROJECT_STATUS_REPORT.md`

## Phase B: Immediate Correctness Fixes

- Fix demo storage so starting a fresh analysis run resets prior run artifacts
- Deduplicate accumulated finding evidence where repeated merges currently duplicate entries
- Add restart recovery handling for Ask sessions alongside analysis runs
- Add explicit Ask resume/recover behavior where needed

## Phase C: Export System Completion

- Introduce richer analysis export generation:
  - Markdown
  - JSON
  - CSV
  - Mermaid
  - PDF
  - ZIP bundle
- Add export history listing in the export center
- Make prior analysis runs re-exportable from canonical persisted state
- Ensure Ask exports and analysis exports use consistent response semantics

## Phase D: Product Surface Improvements

- Upgrade `/exports` to show analysis export variants and history
- Improve `/report` and related report metadata surfaces
- Improve graph/debate/finding linking where low-effort/high-value
- Keep UI changes additive and consistent with the current visual language

## Phase E: Recovery And Operational Hardening

- Extend `deployment/scripts/recover-runs.mjs` to cover Ask sessions
- Ensure interrupted runs/sessions surface recoverable state clearly
- Verify health/readiness behavior remains correct
- Preserve resource-conscious deployment defaults

## Phase F: Testing

- Add a real `test` script
- Add integration tests for:
  - repo import
  - analysis start/completion
  - export generation
  - Ask session completion
  - failure recovery
- Add at least one UI/E2E smoke test for:
  - debate page
  - exports page
  - Ask Mode flow

## Phase G: Documentation And Deployment Refresh

- Update README with actual implemented behavior
- Expand deployment docs with smoke-test and recovery notes
- Document any remaining hard constraints honestly

## Working Assumptions

- The current Next.js / Prisma / App Router stack is good enough and should be preserved
- PostgreSQL remains the durable production backend
- Demo mode is retained, but must behave correctly and predictably
- OpenRouter remains optional, with heuristic fallback preserved for local/demo operation

