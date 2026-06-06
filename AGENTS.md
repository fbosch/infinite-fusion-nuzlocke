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
- When pushing work intended for a PR, use `wt push-nomistakes` or `git push no-mistakes` instead of `git push origin`.
- For targeted testing workflows, run the smallest relevant checks first before broader validation.
- When work touches game-rule behavior or run-state logic, read relevant domain docs listed in `docs/agents/domain/README.md` and local `AGENTS.md` references.
- Keep new guidance failure-mode-driven: prefer local `AGENTS.md` for path scope and narrow skills for repeated non-obvious implementation errors.
- Validation workflow for changed work: run `pnpm type-check`, then `pnpm test:run`, then `pnpm validate` when scope is broad/cross-cutting.

---

<!-- fallow:setup-hooks:start -->
## Fallow local gate

Before any `git commit` or `git push`, run `pnpm exec fallow audit --format json --quiet --explain`. If the verdict is `fail`, fix the reported findings before retrying. Treat JSON runtime errors like `{ "error": true, ... }` as non-blocking.

Audit defaults to `gate=new-only`: only findings introduced by the current changeset affect the verdict. Inherited findings on touched files are reported under `attribution` and annotated with `introduced: false`, but do not block the commit. Set `[audit] gate = "all"` in `fallow.toml` to gate every finding in changed files.
<!-- fallow:setup-hooks:end -->
