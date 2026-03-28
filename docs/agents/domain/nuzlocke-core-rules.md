# Nuzlocke Core Rules

## Critical invariants

- Exactly one catchable first encounter per area for the active run.
- A fainted Pokemon is permanently unusable for that run.
- Every caught Pokemon must have a nickname before becoming valid team data.

## Implementation implications

- Track encounter state by area and block duplicate catches.
- Keep active team and death box as distinct states.
- Reject transitions that place dead Pokemon back into battle-eligible state.
- Enforce nickname requirement in create/import/edit flows.

## Common mistakes

- Treating area visits and area catches as unrelated states.
- Letting imports bypass nickname or death validations.
- Marking fainted Pokemon in UI only while underlying state remains usable.

## Cross-references

- `docs/agents/domain/fusion-mechanics.md`
- `docs/agents/domain/ui-components.md`
- `docs/agents/domain/team-member-selection-architecture.md`
