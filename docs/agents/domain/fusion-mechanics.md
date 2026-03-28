# Fusion Mechanics

## Critical invariants

- Fusion operations must preserve head/body identity for each fused Pokemon.
- DNA Splicer availability and usage must remain internally consistent.
- Fusion-specific state changes must not violate Nuzlocke death constraints.
- DNA Reverser flips head/body identity on the same fusion; it is not unfuse then refuse.
- Self-fusion (`head.id === body.id`) is valid.
- Triple fusion handling is a distinct postgame path, not a normal fusion flow.

## Implementation implications

- Store fusion history as explicit events (fuse, unfuse, refusion).
- Validate fusion inputs before applying state changes.
- Keep fusion metadata (head, body, derived result) queryable for UI and auditing.
- Handle DNA Reverser as an atomic head/body swap while preserving encounter identity.
- Keep fusion typing logic aligned with `src/lib/typings.ts` (dominant-type and swapped-type rules).
- Separate normal fusion logic from triple fusion logic to avoid mixed invariants.

## Common mistakes

- Updating display names/sprites without updating canonical fusion identity fields.
- Treating DNA Reverser as delete+recreate instead of a state-preserving swap.
- Rejecting same-species fusion as invalid input.
- Treating unfuse as delete instead of a reversible state transition.
- Applying generic team updates that ignore fusion-specific constraints.
