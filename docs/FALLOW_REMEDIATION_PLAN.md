# Fallow Remediation Plan

## Goal

Resolve every first-party Fallow finding or record a narrow, reasoned exception. Keep vendored agent skills outside the application quality baseline.

The initial full-project audit reported 317 dead-code findings, 365 complexity findings, and 52 duplication groups. The `.opencode/skills/impeccable` vendor subtree accounts for 56 dead-code findings, 211 complexity findings, and 15 duplication groups. The three phases below deliberately separate audit correctness, runtime safety, and broad maintainability work.

## Working Rules

- Trace an export, file, or dependency before removing it.
- Add outcome-focused coverage before refactoring run-state, API, or interactive UI behavior.
- Keep dependency direction one-way when breaking cycles; do not replace a cycle with a compatibility barrel.
- Add a suppression only for an intentionally retained first-party finding and include its reason.
- Validate each completed slice with the smallest relevant tests, then run the phase checks.

## Phase 1: Trustworthy Audit And Easy Cleanup

Purpose: make Fallow findings actionable and remove low-risk debt before structural refactors.

- [x] Exclude `.opencode/skills/impeccable/**` from first-party Fallow reporting while preserving analysis of product code.
- [x] Configure Fallow to classify the `@data/*` TypeScript alias rather than report it as an unlisted dependency.
- [x] Register or otherwise classify dynamic entry points, including the service worker, web worker, browser-test setup, and public runtime assets.
- [x] Verify the `pnpm-workspace.yaml` dependency override against the lockfile and either retain it with a narrow Fallow exception or remove it.
- [x] Trace `cheerio`, `cli-progress`, `pokedex-promise-v2`, and `tailwindcss`; move each to the dependency class required by its production execution path.
- [x] Trace the seven reported unused dependencies across application code, scripts, CI, and release flows; remove only packages with no consumer.
- [x] Remove verified unused files, types, props, class members, duplicate exports, and small export batches.
- [x] Record remaining first-party findings in a machine-readable baseline grouped by remediation phase.

Acceptance criteria:

- Vendored skill findings no longer affect the first-party baseline.
- Dynamic entry points and aliases do not produce known false positives.
- Every remaining Phase 1 finding is either removed or has a documented disposition.

Validation:

```bash
pnpm type-check
pnpm test:run
pnpm validate
pnpm quality:graph:json
```

## Phase 2: Structural And Runtime Safety

Purpose: remove dependency-cycle and state-transition risks before broader cleanup.

- [x] Map the query, loader, service, data, and query-client import cycles to their public consumers and select one break point per underlying cycle.
- [x] Break the encounters/locations loader cycle with a one-way dependency boundary.
- [x] Break the query/loader/service cycle cluster without adding barrel-mediated cycles.
- [x] Add focused integration coverage for each changed query or loader request path.
- [x] Reconcile this phase with the existing encounter-transition architecture work to avoid parallel ownership changes.
- [x] Add outcome-focused tests for encounter CRUD state changes, including duplicate catches, nickname requirements, team placement, and death handling.
- [x] Simplify `updateEncounter`, artwork variants, and migration paths while preserving run-state invariants.
- [x] Inventory high-complexity API processors by request validation, decisions, side effects, and response behavior.
- [x] Refactor API processors one request path at a time, with success, invalid-input, and downstream-failure coverage.

Phase 2 API inventory: `api/encounters` validates static datasets, merges and caches route data, and returns a sorted schema-validated response; `api/pokemon` validates query input, filters static data, and returns cache/security headers; `api/sprite/artists` requires a nonempty ID parameter, fetches FusionDex HTML, extracts credits, and preserves upstream/error status behavior. The routes now isolate their high-decision processing from HTTP orchestration and have direct request-path coverage. `api/sprite/variants` was inventoried as I/O-heavy but has no top-complexity finding; its request, probe, cache, and response contract remains unchanged.

Acceptance criteria:

- The mapped first-party circular dependencies are removed.
- State transitions preserve Nuzlocke invariants under focused regression tests.
- API contracts remain stable and affected complexity findings decrease.

Validation:

```bash
pnpm type-check
pnpm test:run
pnpm validate
pnpm quality:graph:json
```

Run browser, API, or migration tests for each affected slice.

## Phase 3: Remaining Maintainability Debt

Purpose: close the residual first-party findings through behavior-preserving refactors and verified cleanup.

- [x] Trace and reduce the public export surface in `src/stores/playthroughs/` without removing runtime or external consumers.
- [ ] Remove remaining verified unused files, exports, and types in coherent module batches.
- [ ] Add behavior and accessibility coverage for context-menu, summary-card, PC, team, and location interaction paths.
- [ ] Refactor context-menu action construction and shared behavior before extracting common code.
- [ ] Refactor summary-card and PC/team decision surfaces without widening component interfaces unnecessarily.
- [ ] Resolve UI clone groups only where states and accessibility behavior are identical.
- [ ] Group scraper and sprite clone findings by data-pipeline step.
- [ ] Add deterministic input/output tests before consolidating script utilities.
- [ ] Resolve remaining complexity findings by workflow or pipeline stage, prioritizing items with matching duplication findings.
- [ ] Trace every remaining first-party finding and remove it, refactor it, configure it, or add a narrow reasoned suppression.
- [ ] Save the resulting first-party baseline and keep the changed-code audit gate enabled.

Acceptance criteria:

- No first-party finding remains untriaged.
- Remaining exceptions are intentional, narrow, and documented.
- The audit baseline excludes only vendored code and approved exceptions.

Validation:

```bash
pnpm type-check
pnpm test:run
pnpm validate
pnpm quality:graph:json
```

Run browser and script checks for every affected workflow before closing the phase.
