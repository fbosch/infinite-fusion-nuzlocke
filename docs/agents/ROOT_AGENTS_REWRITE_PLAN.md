# Root AGENTS.md Rewrite Plan

This plan rewrites `AGENTS.md` into a minimal, high-signal root file using the `agents-md-author` guidance.

## Objective

- Reduce root `AGENTS.md` from broad project handbook content to always-on, non-discoverable operational constraints.
- Move detail into local `AGENTS.md`, commands, and `docs/agents/` references.

## Keep / cut / relocate

### Keep in root `AGENTS.md`

- Package manager constraint: use `pnpm`.
- Repo-specific tool-priority policy (MCP/tool ordering) if it remains operationally required.
- Non-discoverable safety constraints that are specific to this repo.
- Pointers to:
  - local `AGENTS.md` files,
  - domain reference docs,
  - action commands.

### Cut from root `AGENTS.md`

- Tech stack summaries and tables.
- Folder tree and architecture overview.
- Generic React/state/accessibility/code-quality doctrine.
- Long checklists and troubleshooting tables.
- Domain rules detail (Nuzlocke/Fusion specifics) as inline prose.

### Relocate from root `AGENTS.md`

- Component and icon constraints -> `src/components/AGENTS.md`.
- Store/persistence constraints -> `src/stores/AGENTS.md`.
- Script workflow constraints -> `scripts/AGENTS.md`.
- Nuzlocke/Fusion/Pokemon domain detail -> `docs/agents/domain/*.md`.
- Testing and validation workflows -> `.opencode/commands/` (`/test-target`, `/validate-changed`) plus brief root references.

## Proposed root `AGENTS.md` structure

1. `# AGENTS`
2. One-sentence project purpose.
3. `## Package manager`
   - `pnpm` only.
4. `## Operational constraints`
   - short bullets for non-discoverable repo-wide constraints only.
5. `## Action commands`
   - `/test-target <path>`
   - `/domain-context <topic>`
   - `/validate-changed`
6. `## References`
   - local AGENTS paths
   - `docs/agents/domain/`
   - `docs/agents/` migration docs (temporary, removable later)

## Draft budget

- Target length: <= 40 lines.
- No tables.
- No duplicated guidance from local `AGENTS.md` or skills.

## Acceptance criteria for rewrite

- Root file is under one page and scannable.
- Every line passes discoverability gate.
- No domain deep-dive content remains inline.
- Root file acts as router to local constraints and on-demand docs.
