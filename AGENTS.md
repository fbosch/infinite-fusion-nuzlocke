# AGENTS

Pokemon Infinite Fusion Nuzlocke tracker with strict run-state invariants.

## Package manager

- Use `pnpm` for all package operations.

## Operational constraints

- Keep repo-wide policy guidance minimal; put directory rules in local `AGENTS.md` files.
- For targeted testing workflows, use action commands instead of embedding long checklists.
- When work touches game-rule behavior or run-state logic, read relevant domain docs listed in `docs/agents/domain/README.md` or local `AGENTS.md` references.
- Keep new guidance failure-mode-driven: prefer local `AGENTS.md` for path scope, commands for explicit workflows, and narrow skills for repeated non-obvious implementation errors.
- Validation workflow for changed work: run `pnpm type-check`, then `pnpm test:run`, then `pnpm validate` when scope is broad/cross-cutting.

## Action commands

- `/test-target <path>`

## Local AGENTS

- `src/components/AGENTS.md`
- `src/stores/AGENTS.md`
- `scripts/AGENTS.md`

## References

- `docs/agents/domain/README.md`
