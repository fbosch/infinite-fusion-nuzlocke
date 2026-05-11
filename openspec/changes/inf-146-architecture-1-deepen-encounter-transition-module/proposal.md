## Why

Encounter transitions are currently spread across `crud.ts`, `status.ts`, `fusion.ts`, and `dragDrop.ts`. Callers use small verbs, but still depend on hidden ordering and side effects for team assignments, first encounter tracking, fusion state, run checkpoints, and event emission. This keeps high-risk Nuzlocke rules distributed instead of concentrated behind one seam.

## What Changes

- Deepen encounter transition ownership so one module orchestrates rule-safe encounter mutations and dependent side effects.
- Define canonical transition operations that encapsulate creation, status updates, fusion changes, drag/drop mutations, cleanup, and required downstream effects.
- Preserve existing behavior by treating this as ownership consolidation and test seam reshaping, not a game-rule rewrite.

## Capabilities

### New Capabilities
- `encounter-transition-module`: Defines canonical encounter transition operations as the owner for encounter mutation side effects and rule ordering.

### Modified Capabilities
- None.

## Impact

- Primary touched paths are `src/stores/playthroughs/encounters/crud.ts`, `src/stores/playthroughs/encounters/status.ts`, `src/stores/playthroughs/encounters/fusion.ts`, and `src/stores/playthroughs/encounters/dragDrop.ts`.
- Test updates will shift from shallow helper-level assertions toward observable encounter/team/graveyard outcomes through deep transition operations.
- No persistence schema migration or user-facing behavior change is expected.
