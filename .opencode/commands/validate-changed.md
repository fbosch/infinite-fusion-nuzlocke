---
description: Validate current changes with fast-to-broad checks
agent: plan
subtask: true
---

Run a validation pass for current repository changes.

Tasks:

1. Inspect changed files (staged and unstaged).
2. Run checks in fast-to-broad order:
   - `pnpm type-check`
   - `pnpm test:run`
   - `pnpm validate` only when change scope is broad or cross-cutting
3. Report failures with the shortest direct next action.
4. Do not edit files in this command.

Output format:

## Changed scope

- `<high-level file groups changed>`

## Results

- `pnpm type-check`: `<pass|fail>`
- `pnpm test:run`: `<pass|fail>`
- `pnpm validate`: `<pass|fail|skipped>` with reason if skipped

## Next action

- `<single recommended next step>`
