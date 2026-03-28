# Domain Doc Migration Plan

This plan migrates project-specific game/domain rules into stable reference docs under `docs/agents/domain/`.

## Target files

- `docs/agents/domain/nuzlocke-core-rules.md`
- `docs/agents/domain/fusion-mechanics.md`
- `docs/agents/domain/pokemon-data.md`
- `docs/agents/domain/ui-components.md`
- `docs/agents/domain/team-member-selection-architecture.md`

## Migration goals

- Keep domain invariants available on demand without bloating always-on agent context.
- Separate immutable game rules from implementation examples.
- Make each domain file usable by `/domain-context <topic>`.

## Per-file content contract

Each file should follow this compact shape:

1. `## Critical invariants` (must not be violated)
2. `## Implementation implications` (what code changes must preserve)
3. `## Common mistakes` (known regressions)
4. `## Cross-references` (other domain docs and command usage)

## Source mapping

- `nuzlocke-core-rules.mdc` -> `docs/agents/domain/nuzlocke-core-rules.md`
- `fusion-mechanics.mdc` -> `docs/agents/domain/fusion-mechanics.md`
- `pokemon-data.mdc` -> `docs/agents/domain/pokemon-data.md`
- `ui-components.mdc` -> `docs/agents/domain/ui-components.md`
- `team-member-selection-architecture.mdc` -> `docs/agents/domain/team-member-selection-architecture.md`

## Authoring rules

- Keep each file concise (target <= 60 lines).
- Prefer invariant statements over tutorials.
- Remove Cursor metadata/frontmatter and any tooling-specific wrappers.
- Keep references explicit with file paths.
- Avoid duplicating guidance already placed in local/root `AGENTS.md`.

## Integration points

- `/domain-context <topic>` resolves directly to one of these files.
- Root `AGENTS.md` links to `docs/agents/domain/` as on-demand context.
- Local AGENTS files link to relevant domain docs instead of embedding domain detail.

## Acceptance criteria

- All five domain docs exist under `docs/agents/domain/`.
- Each file has explicit invariants and implementation implications.
- No generic framework guidance is mixed into domain docs.
- Domain docs are sufficient for command-driven context loading.
