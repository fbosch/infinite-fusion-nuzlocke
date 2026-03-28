# Migration Phases and Validation Checkpoints

This execution sequence turns the migration plan into ordered implementation phases with explicit checkpoints.

## Phase 0 - Baseline freeze

### Actions

1. Keep planning docs under `docs/agents/` as source of truth for scope.
2. Confirm no additional migration primitives are added beyond: local `AGENTS.md`, root `AGENTS.md`, commands, domain docs, and selective skills.

### Checkpoint

- All planning docs exist and agree on the same command set and artifact boundaries.

## Phase 1 - Cleanup first

### Actions

1. Delete `.cursor/rules/rule-formatting.mdc`.
2. Remove duplicated section from `.cursor/rules/mcp-tools-guide.mdc` while preserving one canonical version.

### Checkpoint

- Cleanup diff contains only the two intended changes.

## Phase 2 - Domain docs migration

### Actions

1. Create `docs/agents/domain/` files for:
   - `nuzlocke-core-rules.md`
   - `fusion-mechanics.md`
   - `pokemon-data.md`
   - `ui-components.md`
   - `team-member-selection-architecture.md`
2. Normalize each to invariant-focused sections.

### Checkpoint

- `/domain-context <topic>` can resolve to all five topics by path and each file has invariants plus implementation implications.

## Phase 3 - AGENTS minimization and localization

### Actions

1. Rewrite root `AGENTS.md` per `docs/agents/ROOT_AGENTS_REWRITE_PLAN.md`.
2. Add:
   - `src/components/AGENTS.md`
   - `src/stores/AGENTS.md`
   - `scripts/AGENTS.md`
3. Ensure rules are non-duplicative and directory-scoped.

### Checkpoint

- Root file is concise and routing-focused.
- Local files contain only local non-discoverable constraints.

## Phase 4 - Command implementation

### Actions

1. Create `.opencode/commands/test-target.md`.
2. Create `.opencode/commands/domain-context.md`.
3. Create `.opencode/commands/validate-changed.md`.
4. Validate command frontmatter compatibility (OpenCode-supported fields only).

### Checkpoint

- Each command has clear input contract, output contract, and no overlap with local AGENTS responsibilities.

## Phase 5 - Selective skill extraction

### Actions

1. Ditch broad React-general skills already covered by model baseline and `vercel-react-best-practices`.
2. Implement only narrow skills that passed retention audit:
   - `react-derived-state` (if regression history justifies)
   - `web-accessibility` (procedural checklist focus)
   - `zod-validation-patterns` (repo convention focus)

### Checkpoint

- Every added skill references a concrete failure mode not prevented by existing skills/model baseline.

## Phase 6 - End-to-end validation

### Actions

1. Verify crosswalk consistency against produced artifacts.
2. Verify root/local AGENTS references resolve.
3. Run repo validation commands after structural edits:
   - `pnpm type-check`
   - `pnpm test:run`
   - `pnpm validate` (if touched areas justify full pass)

### Checkpoint

- No unmapped Cursor rule remains.
- No duplicate policy text across root/local AGENTS and commands.
- Validation commands pass or failures are documented with next actions.

## Rollback and risk control

- Execute one phase per change set where possible.
- Stop at phase boundaries for review before continuing.
- If a phase introduces ambiguity, update planning docs first, then continue implementation.
