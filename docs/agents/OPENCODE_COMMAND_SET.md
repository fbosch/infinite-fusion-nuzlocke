# OpenCode Minimal Command Set

This document defines the first command set for migration. Commands are reserved for explicit user-invoked actions that are not reliably auto-discoverable from repository path context.

## Command selection criteria

- Use a command only when the user is choosing an operation mode or context bundle.
- Do not use commands for directory-scoped rules; use local `AGENTS.md` files instead.
- Keep commands focused, with clear inputs and deterministic output shape.

## Command 1: `/test-target <path>`

### Purpose

Given a changed file or feature path, choose and run the right test strategy with minimal user input.

### Inputs

- Required: `<path>` relative to repo root.

### Responsibilities

- Classify test environment requirements from target path and code usage:
  - `node` test when DOM/browser APIs are not required.
  - `browser` test when DOM/browser APIs are required.
- Apply naming guidance for test placement and filename conventions.
- Recommend or execute the smallest relevant test scope first, then broader validation when needed.

### Output contract

- Return a short report with:
  - chosen environment (`node` or `browser`) and reason,
  - proposed test file path/name,
  - commands to run (or commands executed),
  - follow-up validation command if risk warrants it.

### Source rule coverage

- `testing-guide.mdc`
- `browser-test-naming.mdc`

## Command 2: `/domain-context <topic>`

### Purpose

Load domain-specific guidance on demand for Nuzlocke and Infinite Fusion mechanics.

### Inputs

- Required: `<topic>` from a constrained set:
  - `nuzlocke-core-rules`
  - `fusion-mechanics`
  - `pokemon-data`
  - `ui-components`
  - `team-member-selection-architecture`

### Responsibilities

- Resolve topic to `docs/agents/domain/<topic>.md`.
- Return a concise operational brief for implementation decisions.
- Highlight invariant rules that must not be violated by code changes.

### Output contract

- Return a compact brief with:
  - critical invariants,
  - implementation implications,
  - common mistakes to avoid,
  - references to exact doc paths used.

### Source rule coverage

- `nuzlocke-core-rules.mdc`
- `fusion-mechanics.mdc`
- `pokemon-data.mdc`
- `ui-components.mdc`
- `team-member-selection-architecture.mdc`

## Command 3: `/validate-changed`

### Purpose

Run a repeatable validation workflow for current changes, prioritizing fast feedback.

### Inputs

- No required arguments.

### Responsibilities

- Detect changed scope (staged/unstaged files) and pick the minimal safe validation sequence.
- Run repository-standard commands in fast-to-slower order.
- Report failures with direct next actions.

### Baseline sequence

1. `pnpm type-check`
2. `pnpm test:run` (or a narrower test command when unambiguously safe)
3. `pnpm validate` for final full pass when needed

### Output contract

- Return status per command (`pass`/`fail`), key failure lines, and a single recommended next step.

### Source rule coverage

- `code-quality-linting.mdc`
- `project-guide.mdc` (command conventions)
- `mcp-tools-guide.mdc` (tooling priority context)

## Non-goals for this phase

- No additional command aliases.
- No directory-scoped task commands (for example `/component-task`, `/store-task`, `/scraper-task`).
- No command that duplicates always-on local `AGENTS.md` behavior.

## Planned file targets

- `.opencode/commands/test-target.md`
- `.opencode/commands/domain-context.md`
- `.opencode/commands/validate-changed.md`
