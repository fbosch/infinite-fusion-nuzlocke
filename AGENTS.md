# AGENTS

Pokemon Infinite Fusion Nuzlocke tracker with strict run-state invariants.

## Package manager

- Use `pnpm` for all package operations.

## Runtime stack

- Framework/runtime: Next.js 16 + React 19.
- State management: Valtio for app run-state, TanStack Query for server/cache state.
- Validation and schemas: Zod for runtime data boundaries.

## Operational constraints

- Keep repo-wide policy guidance minimal; put directory rules in local `AGENTS.md` files.
- For targeted testing workflows, run the smallest relevant checks first before broader validation.
- When work touches game-rule behavior or run-state logic, read relevant domain docs listed in `docs/agents/domain/README.md` and local `AGENTS.md` references.
- Keep new guidance failure-mode-driven: prefer local `AGENTS.md` for path scope and narrow skills for repeated non-obvious implementation errors.
- Validation workflow for changed work: run `pnpm type-check`, then `pnpm test:run`, then `pnpm validate` when scope is broad/cross-cutting.

## Skills

- `react-derived-state`: prevent effect-sync loops and duplicated derived state.
- `web-accessibility`: enforce keyboard parity and ARIA semantics for interactive UI.
- `zod-validation-patterns`: enforce consistent validation at untrusted-data boundaries.

## Local AGENTS

- `src/components/AGENTS.md` - UI and interaction rules.
- `src/stores/AGENTS.md` - playthrough state and persistence invariants.
- `scripts/AGENTS.md` - data scraping and generation script constraints.

## References

- `docs/agents/domain/README.md`
