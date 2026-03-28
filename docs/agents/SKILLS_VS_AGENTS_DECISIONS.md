# Skills vs AGENTS.md Decisions

This document decides which migration content should become reusable skills versus always-on `AGENTS.md` guidance.

Primary rule: if guidance is auto-discoverable from code, config, or standard tooling, do not put it in `AGENTS.md`. Keep `AGENTS.md` for non-discoverable operational constraints.

## Decision criteria

- Use a **skill** when guidance is reusable implementation knowledge and should activate from task intent.
- Use **AGENTS.md** when guidance is a stable, non-discoverable constraint that must always apply in repo or directory scope.
- Keep **generic best-practice reminders** out of both when they are already model-common and not repo-specific.

## Decisions from Cursor rule set

| Source rule                  | Keep as skill? | Keep in AGENTS.md? | Decision                                                                                                      |
| ---------------------------- | -------------- | ------------------ | ------------------------------------------------------------------------------------------------------------- |
| `calculated-state.mdc`       | yes            | no                 | Skill: reusable derived-state implementation pattern.                                                         |
| `react-guide.mdc`            | yes (trimmed)  | no                 | Skill: reusable React component patterns; remove obvious framework basics.                                    |
| `react-state-management.mdc` | yes (trimmed)  | no                 | Skill: reusable state decisions; dedupe overlap with `calculated-state`.                                      |
| `validation-guide.mdc`       | yes            | no                 | Skill: reusable Zod validation patterns and error-shape handling.                                             |
| `accessibility.mdc`          | yes (focused)  | partial            | Skill for implementation patterns; keep only project-specific accessibility landmines in AGENTS if any exist. |
| `icon-usage.mdc`             | no             | yes (local)        | Local `src/components/AGENTS.md`: repo-specific `lucide-react` constraint and sizing conventions.             |
| `scraping-scripts.mdc`       | no             | yes (local)        | Local `scripts/AGENTS.md`: directory-scoped script workflow and operational constraints.                      |
| `code-quality-guide.mdc`     | no             | minimal            | Keep only repo-specific non-discoverable constraints in root `AGENTS.md`; drop generic style advice.          |
| `quality-security.mdc`       | no             | minimal            | Keep only repo-specific safety rules (if any); drop generic security doctrine.                                |
| `project-guide.mdc`          | no             | minimal            | Keep only package-manager and non-obvious repo workflow constraints.                                          |
| `mcp-tools-guide.mdc`        | no             | yes (root)         | Root `AGENTS.md`: repo-level tool-priority policy is operational and always-on.                               |

## Explicit exclusions

- Do not create a skill for broad lint/style/security checklists that duplicate model priors.
- Do not keep tech-stack summaries, folder trees, or obvious framework guidance in `AGENTS.md`.
- Do not encode path-scoped rules as skills when local `AGENTS.md` is sufficient.

## Planned outputs from this decision

- Skills:
  - `.opencode/skills/react-derived-state/`
  - `.opencode/skills/react-component-patterns/`
  - `.opencode/skills/react-state-management/`
  - `.opencode/skills/zod-validation-patterns/`
  - `.opencode/skills/web-accessibility/` (focused)
- AGENTS guidance:
  - `AGENTS.md` (root, minimal)
  - `src/components/AGENTS.md`
  - `src/stores/AGENTS.md`
  - `scripts/AGENTS.md`
