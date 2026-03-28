# AGENTS

Local rules for playthrough and persistence state changes.

## Constraints

- Preserve Nuzlocke invariants in all store mutations (one catch per area, death is permanent, nickname required).
- Keep active team, encounter history, and death box as separate canonical states.
- For Pokemon edits, prefer identity-based updates and do not infer storage field from UI slot.
- Use encounter-field updates only when intentionally changing encounter structure.

## Domain references

- `docs/agents/domain/nuzlocke-core-rules.md`
- `docs/agents/domain/team-member-selection-architecture.md`
- `docs/agents/domain/fusion-mechanics.md`
