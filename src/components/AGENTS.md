# AGENTS

Local rules for UI and component work.

## Constraints

- Use `lucide-react` icons only; do not use UTF symbols as icons.
- Keep icon sizing consistent with existing component patterns (`h-4 w-4`, `h-5 w-5`, `h-6 w-6`).
- Any non-semantic interactive wrapper must provide keyboard parity (`tabIndex={0}` plus Enter/Space handling).
- Treat UI as a consumer of validated run state; do not bypass store validations in component logic.

## Domain references

- `docs/agents/domain/ui-components.md`
- `docs/agents/domain/team-member-selection-architecture.md`
- `docs/agents/domain/nuzlocke-core-rules.md`
