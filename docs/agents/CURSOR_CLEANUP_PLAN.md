# Cursor Rules Cleanup Plan

This step removes obsolete Cursor-only material and normalizes known redundant content before final migration execution.

## Scope

- Delete obsolete file: `.cursor/rules/rule-formatting.mdc`
- Remove duplicated section from: `.cursor/rules/mcp-tools-guide.mdc`

## Why these changes

- `rule-formatting.mdc` is specific to Cursor `.mdc` authoring and has no OpenCode equivalent value.
- `mcp-tools-guide.mdc` contains a repeated section that adds noise and increases migration error risk.

## Cleanup actions

1. Delete `.cursor/rules/rule-formatting.mdc`.
2. Edit `.cursor/rules/mcp-tools-guide.mdc` to keep one canonical copy of duplicated guidance.
3. Preserve semantics in the retained section; dedupe only, no policy rewrite in this step.

## Validation checks

- Confirm `.cursor/rules/rule-formatting.mdc` is removed.
- Confirm duplicate block is removed from `.cursor/rules/mcp-tools-guide.mdc`.
- Confirm no other `.cursor/rules/*.mdc` content changed in this cleanup step.

## Out of scope for this step

- No migration of remaining Cursor rule files yet.
- No edits to root/local `AGENTS.md` yet.
- No command or skill file creation yet.
