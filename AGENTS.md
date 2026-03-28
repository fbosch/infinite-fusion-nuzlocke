# AGENTS

Pokemon Infinite Fusion Nuzlocke tracker with strict run-state invariants.

## Package manager

- Use `pnpm` for all package operations.

## Operational constraints

- Keep repo-wide policy guidance minimal; put directory rules in local `AGENTS.md` files.
- For testing and validation workflows, use action commands instead of embedding long checklists.
- Load domain mechanics from `docs/agents/domain/` when work touches game-rule behavior.
- Keep new guidance failure-mode-driven: prefer local `AGENTS.md` for path scope, commands for explicit workflows, and narrow skills for repeated non-obvious implementation errors.

## Action commands

- `/test-target <path>`
- `/domain-context <topic>`
- `/validate-changed`

## Local AGENTS

- `src/components/AGENTS.md`
- `src/stores/AGENTS.md`
- `scripts/AGENTS.md`

## References

- `docs/agents/domain/`
