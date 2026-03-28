---
description: Choose test environment and commands for a target path
agent: plan
subtask: true
---

If `$ARGUMENTS` is empty, respond only:
`Usage: /test-target <path>`

You are selecting the smallest safe test workflow for this repository.

Target path: `$ARGUMENTS`

Tasks:

1. Inspect the target path and nearby files to determine whether the test should run in `node` or `browser` environment.
2. Apply naming guidance:
   - Use `*.browser.test.*` when DOM/browser APIs are required.
   - Use `*.test.*` for non-browser tests.
3. Propose the smallest relevant test command first, then a broader follow-up if needed.
4. Do not edit files in this command.

Output format:

## Environment

- `<node|browser>` with one-sentence reason

## Suggested test file

- `<relative path and filename pattern>`

## Commands

- `<smallest relevant command>`
- `<optional broader follow-up command>`

## Notes

- `<brief risk or edge-case note>`
