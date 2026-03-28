# Migration Execution Status

Status of the Cursor-rules to OpenCode migration on this branch.

## Phase status

- Phase 1 (cleanup): completed
  - Deleted `.cursor/rules/rule-formatting.mdc`
  - Deduplicated `.cursor/rules/mcp-tools-guide.mdc`
- Phase 2 (domain docs): completed
  - Added 5 files under `docs/agents/domain/`
- Phase 3 (AGENTS minimization/localization): completed
  - Rewrote root `AGENTS.md`
  - Added `src/components/AGENTS.md`, `src/stores/AGENTS.md`, `scripts/AGENTS.md`
- Phase 4 (commands): completed
  - Added `.opencode/commands/test-target.md`
  - Added `.opencode/commands/domain-context.md`
  - Added `.opencode/commands/validate-changed.md`
- Phase 5 (selective skills): completed
  - Added `.opencode/skills/react-derived-state/SKILL.md`
  - Added `.opencode/skills/zod-validation-patterns/SKILL.md`
  - Added `.opencode/skills/web-accessibility/SKILL.md`
  - Ditch decision maintained for broad React-general skills
- Phase 6 (end-to-end validation): completed with environment blockers
  - Structure and reference checks passed
  - Command presence checks passed
  - Validation command execution blocked by missing runtime dependencies/tools in current environment

## Validation blockers observed

- `pnpm type-check` failed with missing module/type environment (for example `next`, `react`, `zod`, Node typings)
- `pnpm test:run` failed with `vitest: command not found`
- `pnpm validate` ran `prettier --check` successfully, then failed at `next lint` with `next: command not found`

## Next actions

1. Install dependencies in this environment (`pnpm install`) and rerun validation commands.
2. If validation still fails, treat remaining errors as baseline project issues unless introduced by migration files.
3. Finalize with commit/PR when user requests.
