# UI Components

## Critical invariants

- Team, encounter, badge, and fusion UI must reflect canonical run state without hidden side channels.
- UI affordances must enforce Nuzlocke constraints rather than bypass them.
- Fusion-related screens must display head/body semantics consistently.

## Implementation implications

- Keep component actions bound to validated store operations.
- Prefer explicit disabled/error states when an action would break game rules.
- Ensure trackers (encounters, badges, progress) consume the same canonical state model.
- Treat import/export and settings UI as run-integrity operations, not cosmetic features.

## Common mistakes

- Allowing UI-only optimistic updates that diverge from validated store state.
- Building separate calculations per panel that drift from shared game logic.
- Coupling selector layout assumptions to storage layout assumptions.

## Cross-references

- `docs/agents/domain/nuzlocke-core-rules.md`
- `docs/agents/domain/fusion-mechanics.md`
- `docs/agents/domain/team-member-selection-architecture.md`
- `.opencode/commands/domain-context.md`
