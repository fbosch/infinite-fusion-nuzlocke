# Team Member Selection Architecture

## Critical invariants

- UI selection slots are presentation constructs and are not data-location guarantees.
- Pokemon updates by identity must not assume storage field (`head`/`body`) from UI slot.
- Encounter structure changes and Pokemon field updates are separate operations.

## Implementation implications

- Use identity-based update paths for Pokemon edits (nickname, status, metadata).
- Use field-based encounter updates only when intentionally mutating encounter structure.
- Keep selection UI state decoupled from persistence-layer addressing.

## Common mistakes

- Mapping a selected UI slot directly to `updatePokemonInEncounter(..., 'head'|'body', ...)`.
- Mutating encounter field layout when the intended action is Pokemon attribute edit.
- Building feature logic that treats visual slot order as canonical storage order.

## Cross-references

- `src/components/team/TeamMemberSelectionContext.tsx`
- `src/stores/playthroughs/encounters.ts`
- `docs/agents/domain/ui-components.md`
- `.opencode/commands/domain-context.md`
