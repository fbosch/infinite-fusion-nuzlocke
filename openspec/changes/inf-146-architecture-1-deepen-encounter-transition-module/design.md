## Context

Current encounter behavior is correct but fragmented. Multiple files hold parts of transition logic, and callers may still need sequencing knowledge to preserve invariants. Architecture review identified this as the highest-impact deepening candidate because it governs core run-state safety rules.

## Goals

- Make one deep encounter transition owner responsible for rule-safe state mutations and mandatory side effects.
- Preserve behavior for encounter creation, status transitions, fusion creation, drag/drop, cleanup, and event emission.
- Move verification to observable outcomes at the transition seam instead of shallow internal helper behavior.

## Non-Goals

- Changing Nuzlocke rule semantics or user-visible outcomes.
- Introducing new persistence contracts or API surface changes.
- Broad unrelated refactors outside encounter transition ownership.

## Decisions

1. Canonical transition operations own ordering and side effects for encounter mutations.
2. Existing operation entrypoints may delegate internally, but callers must not reconstruct transition sequencing themselves.
3. Behavior parity is proven through observable run-state and emission outcomes, not helper-internal snapshots.
4. If a mutation path bypasses deep transition ownership for tracked behavior, it is non-compliant.

## Validation Strategy

- Add focused tests that exercise encounter/team/graveyard observable outcomes through deep transition operations.
- Replace shallow tests that only mirror implementation details and fail to protect caller-facing behavior.
- Run type-check and targeted test validation for touched encounter transition modules.
