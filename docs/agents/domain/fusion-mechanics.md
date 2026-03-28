# Fusion Mechanics

## Critical invariants

- Fusion operations must preserve head/body identity for each fused Pokemon.
- DNA Splicer availability and usage must remain internally consistent.
- Fusion-specific state changes must not violate Nuzlocke death constraints.
- Triple fusion handling is a distinct postgame path, not a normal fusion flow.

## Implementation implications

- Store fusion history as explicit events (fuse, unfuse, refusion).
- Validate fusion inputs before applying state changes.
- Keep fusion metadata (head, body, derived result) queryable for UI and auditing.
- Separate normal fusion logic from triple fusion logic to avoid mixed invariants.

## Common mistakes

- Updating display names/sprites without updating canonical fusion identity fields.
- Treating unfuse as delete instead of a reversible state transition.
- Applying generic team updates that ignore fusion-specific constraints.

## Cross-references

- `docs/agents/domain/nuzlocke-core-rules.md`
- `docs/agents/domain/pokemon-data.md`
- `docs/agents/domain/ui-components.md`
