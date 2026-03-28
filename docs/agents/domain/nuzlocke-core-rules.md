# Nuzlocke Core Rules

## Critical invariants

- Exactly one catchable first encounter per area for the active run.
- A fainted Pokemon is permanently unusable for that run.
- If a fused Pokemon faints, both component Pokemon are permanently unusable.
- Every caught Pokemon must have a nickname before becoming valid team data.

## Implementation implications

- Track encounter state by area and block duplicate catches.
- Keep active team and death box as distinct states.
- Reject transitions that place dead Pokemon back into battle-eligible state.
- Ensure fusion death propagation marks both head and body as dead atomically.
- Enforce nickname requirement in create/import/edit flows.

## Common mistakes

- Treating area visits and area catches as unrelated states.
- Letting imports bypass nickname or death validations.
- Marking fainted Pokemon in UI only while underlying state remains usable.
- Allowing unfuse flows to resurrect one component of a dead fusion.
