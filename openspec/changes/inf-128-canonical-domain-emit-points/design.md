## Context

Current analytics emissions are mostly domain-driven, but some semantic actions still emit only in specific UI flows. This creates blind spots and duplicate semantics where the same transition can be represented differently depending on entrypoint.

## Goals

- Make canonical store/domain operations the single emit owner for each telemetry semantic action.
- Ensure semantic equivalence: identical domain transitions produce identical event ids and required fields.
- Preserve source context through bounded metadata (`source_surface`, `trigger_method`) without splitting event taxonomy.

## Non-Goals

- Defining new product analytics funnels beyond normalization scope.
- Introducing compatibility aliases for legacy event names.
- Broad refactors of unrelated store or component architecture.

## Decisions

1. Event emission ownership lives in canonical domain operations, not view-layer handlers.
2. UI surfaces call domain operations and pass bounded source metadata when needed.
3. Equivalent transitions across table/team/context-menu/keyboard paths use one event id and shared required payload contract.
4. If a path bypasses canonical operation, it is non-compliant and must be routed through canonical logic before merge.

## Validation Strategy

- Add focused tests for at least one previously divergent action to prove semantic/event equivalence across two entry surfaces.
- Add targeted tests that fail when a bypass path mutates state without canonical emit behavior.
- Run targeted lint and tests for touched analytics and store modules.
