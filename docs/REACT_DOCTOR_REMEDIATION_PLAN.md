# React Doctor Remediation Plan

## Goal

Resolve confirmed React Doctor runtime-quality findings without duplicating the structural quality work owned by Fallow. Keep the changed-code gate enabled while the existing baseline is triaged in focused, behavior-preserving slices.

The initial full scan reported 267 diagnostics across 77 files: 12 errors and 255 warnings. The enforced React Doctor scope intentionally excludes maintainability, dead-code, supply-chain, and design checks; it reports 119 diagnostics across 54 files: 12 errors and 107 warnings. The observed health score was 41/100. The score is advisory because it is calculated by React Doctor's hosted service and can change independently of the local scanner.

## Ownership Boundary

| Area | Owner | React Doctor treatment |
| --- | --- | --- |
| Dependency hygiene, dead code, cycles, boundaries, duplication, complexity | Fallow | Disabled or excluded |
| Runtime bugs, React Compiler blockers, application performance | React Doctor | Enforced for new error-level findings |
| Accessibility | React Doctor | Enforced for new error-level findings |
| Application security | React Doctor | Enforced for new error-level findings |
| UI design heuristics | Impeccable and manual review | Excluded |

## Working Rules

- Treat every diagnostic as a hypothesis until the affected code is understood.
- Fix the underlying behavior before adding a suppression.
- Add a narrow, documented suppression only for a confirmed false positive or intentional tradeoff.
- Keep unrelated runtime, accessibility, and component refactors in separate changes.
- Add focused coverage before changing state transitions, API behavior, or interactive UI flows.
- Do not raise the gate from error to warning until the existing baseline has an explicit disposition.

## Phase 1: Error-Level Triage

Purpose: resolve or classify every blocking diagnostic before broad warning cleanup.

- [x] Remove the GET handler's in-flight response cache in `src/app/api/sprite/variants/route.ts`. It shared a consumable `NextResponse` between concurrent requests and did not globally bound CDN probe work; HTTP and client caching remain in place.
- [x] Resolve ref-access-during-render compiler blockers. `useLocalStorage` now initializes without reading a ref during render; Floating UI commit-time ref callbacks in `ContextMenu`, `CursorTooltip`, and `PokemonEvolutionButton` have narrow documented exceptions.
- [x] Remove compiler-blocking manual memoization from `DraggableComboboxSprite`, `PokemonPCSheet`, and `TeamSlots`; each value is now a direct derivation from its canonical inputs.
- [x] Retain the existing compiler opt-outs for TanStack Table and Virtual, adding narrow documented incompatible-library exceptions at their boundaries.
- [x] Move the file-change cleanup handler out of `usePlaythroughImportExport` so its `try`/`finally` is not lowered by React Compiler.
- [x] Harden package installation with a one-day minimum release age and a no-downgrade trust policy.
- [x] Scope Vercel preview credentials to the validation, pull, build, and deploy steps so dependency installation runs without secrets. Build steps still receive credentials because the Vercel CLI requires them.

Acceptance criteria:

- Every current error is fixed, deliberately suppressed with evidence, or tracked as a product or architecture decision.
- A changed-code scan against `master` reports no new errors.
- Affected state, API, and interaction paths retain focused regression coverage.

## Phase 2: Safe Accessibility And Correctness Cleanup

Purpose: reduce high-volume, low-risk warnings that have direct semantic fixes.

- [ ] Add explicit button types for the 32 `button-has-type` findings.
- [ ] Fix the three nested interactive-control findings without changing keyboard or pointer behavior.
- [ ] Add accessible labels to controls missing an associated label or relying only on placeholder text.
- [ ] Review unversioned localStorage keys and add migration-safe versioning only where stored values have a defined evolution path.

Acceptance criteria:

- Button and control changes have relevant interaction or accessibility coverage.
- No control loses an accessible name, keyboard path, or form behavior.

## Phase 3: Valtio Callback Audit

Purpose: determine whether snapshot reads in callbacks are stale-state risks before changing state access patterns.

- [x] Audit all `valtio-no-snapshot-in-callback` findings individually or by shared callback pattern.
- [x] Fix `src/components/LocationTable/FusionToggleButton.tsx`: its drop handlers now capture current drag state at event time and preserve the source across the asynchronous fusion operation; its render snapshot remains limited to the drop affordance.
- [x] Fix `src/components/PokemonCombobox/useComboboxDragAndDrop.ts`: capture a drop's drag value before async lookup, check current drag data before publishing previews, and preserve the name that scheduled each preview lookup.
- [x] Fix the remaining callbacks in `src/components/PokemonCombobox/DraggableComboboxSprite.tsx` and `src/stores/playthroughs/hooks.ts` to read the current proxy state when authorizing a drag or deciding whether to load playthroughs.
- [ ] For each finding, decide whether the callback needs render-time snapshot data or current store state.
- [ ] Add regression coverage for callbacks whose state source changes.

Acceptance criteria:

- No callback fix changes a state transition without direct behavioral coverage.
- All callback snapshot findings are resolved; render-time snapshots remain only for render-derived values and effect subscriptions.

## Phase 4: Targeted Performance Cleanup

Purpose: address concrete runtime costs without speculative micro-optimization.

- [ ] Review chained array iterations and array lookups in loops; consolidate only on verified hot paths or where the simpler implementation is equally clear.
- [x] Replace `transition: all` declarations with the specific animated properties.
- [ ] Review await-in-loop findings for required ordering before introducing concurrency.
- [ ] Replace JSON parse/stringify cloning only when the data shape, supported values, and copy semantics are known.
- [ ] Address set-state-in-effect findings after confirming their derived-state behavior.

Acceptance criteria:

- Performance changes preserve ordering, cancellation, and rendering semantics.
- Benchmarks or targeted tests support changes on identified hot paths.

## Phase 5: Fallow-Owned Maintainability Backlog

Purpose: retain React Doctor's maintainability observations as optional context without creating a competing gate.

- [ ] Use Fallow findings and existing architecture plans to prioritize large components and manual memoization patterns.
- [ ] Consider `src/components/LocationTable/EncounterCell.tsx`, `src/components/PokemonSummaryCard/LocationSelector.tsx`, and `src/components/PokemonCombobox/useComboboxDragAndDrop.ts` only within a focused Fallow-led refactor.
- [ ] Do not change runtime code solely to improve the React Doctor score.

Acceptance criteria:

- Fallow remains the sole structural and maintainability quality gate.
- React Doctor's excluded categories remain advisory context only.

## Validation

Run the smallest relevant tests for each slice, then run:

```bash
pnpm type-check
pnpm test:run
pnpm validate
pnpm quality:graph
pnpm quality:react
```

Use a full advisory scan to measure baseline progress without changing the enforcement scope:

```bash
pnpm exec react-doctor . --yes --no-score --blocking none
pnpm exec react-doctor --score --yes
```
