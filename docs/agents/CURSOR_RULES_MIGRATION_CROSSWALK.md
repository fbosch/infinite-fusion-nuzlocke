# Cursor Rules Migration Crosswalk

This document maps each `.cursor/rules/*.mdc` file to one target destination:

- `skill`
- `local AGENTS.md`
- `command`
- `reference doc`
- `delete`

## File-by-file mapping

| Source file                              | Destination     | Target path (planned)                                      | Why                                                                                                     |
| ---------------------------------------- | --------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `accessibility.mdc`                      | skill           | `.opencode/skills/web-accessibility/`                      | Reusable WCAG guidance; not path-scoped to this repo.                                                   |
| `browser-test-naming.mdc`                | command         | `.opencode/commands/test-target.md`                        | Action-based choice of browser vs node test environment.                                                |
| `calculated-state.mdc`                   | skill           | `.opencode/skills/react-derived-state/`                    | Reusable derived-state pattern.                                                                         |
| `code-quality-guide.mdc`                 | local AGENTS.md | `AGENTS.md` (root, condensed)                              | Broad defaults are mostly discoverable; keep only non-discoverable constraints.                         |
| `code-quality-linting.mdc`               | command         | `.opencode/commands/validate-changed.md`                   | Action workflow for changed-files validation.                                                           |
| `data-persistence.mdc`                   | local AGENTS.md | `src/stores/AGENTS.md`                                     | Directory-scoped persistence rules tied to store architecture.                                          |
| `fusion-mechanics.mdc`                   | reference doc   | `docs/agents/domain/fusion-mechanics.md`                   | Domain knowledge; load on demand.                                                                       |
| `icon-usage.mdc`                         | local AGENTS.md | `src/components/AGENTS.md`                                 | Project-specific icon constraint (`lucide-react`) and sizing conventions.                               |
| `mcp-tools-guide.mdc`                    | local AGENTS.md | `AGENTS.md` (root, condensed)                              | Repo-level tool priority is always-on operational policy.                                               |
| `nuzlocke-core-rules.mdc`                | reference doc   | `docs/agents/domain/nuzlocke-core-rules.md`                | Domain rules; contextual, not always needed.                                                            |
| `pokemon-data.mdc`                       | reference doc   | `docs/agents/domain/pokemon-data.md`                       | Domain and source-of-truth data context.                                                                |
| `project-guide.mdc`                      | local AGENTS.md | `AGENTS.md` (root, condensed)                              | Keep only non-discoverable repo constraints and critical commands.                                      |
| `quality-security.mdc`                   | local AGENTS.md | `AGENTS.md` (root, condensed)                              | Keep only repo-specific safety constraints; generic security advice stays out.                          |
| `react-guide.mdc`                        | delete          | n/a                                                        | Broad React guidance is covered by model baseline and pre-installed `vercel-react-best-practices`.      |
| `react-state-management.mdc`             | delete          | n/a                                                        | Broad React state guidance overlaps with existing skills; retain only derived-state anti-pattern skill. |
| `rule-formatting.mdc`                    | delete          | n/a                                                        | Cursor-specific `.mdc` authoring format is obsolete in OpenCode.                                        |
| `scraping-scripts.mdc`                   | local AGENTS.md | `scripts/AGENTS.md`                                        | Directory-scoped workflow and conventions for local scripts.                                            |
| `team-member-selection-architecture.mdc` | reference doc   | `docs/agents/domain/team-member-selection-architecture.md` | Project-specific architectural caveat.                                                                  |
| `testing-guide.mdc`                      | command         | `.opencode/commands/test-target.md`                        | Action-triggered testing workflow and environment selection.                                            |
| `ui-components.mdc`                      | reference doc   | `docs/agents/domain/ui-components.md`                      | Product/domain component requirements; on-demand context.                                               |
| `validation-guide.mdc`                   | skill           | `.opencode/skills/zod-validation-patterns/`                | Reusable Zod validation patterns.                                                                       |

## Initial command set (minimal)

1. `/test-target <path>`
2. `/domain-context <topic>`
3. `/validate-changed`

These are action-based and not reliably auto-discoverable from filesystem path alone.
