# Skill Retention Audit

This audit decides which planned new skills should be dropped, merged, or kept, based on:

- current model baseline capability,
- overlap with pre-existing skills in your setup,
- whether repo-specific value remains after overlap removal.

## Pre-existing skill overlap to account for

- `vercel-react-best-practices`: strong overlap with generic React component and state guidance.
- `ts-pattern`, `typescript-advanced-types`, `tsconfig`: TypeScript-specific overlaps for advanced typing/config tasks.
- `agents-md-author`, `opencode-command-authoring`, `skill-creator`: directly cover AGENTS/command/skill authoring workflows.

## Decision rubric

- **Ditch**: model can do it well already, or overlap with existing skill is high, and no repo-specific edge remains.
- **Keep (narrow)**: only if there is non-obvious, repeated, project-relevant procedure not covered elsewhere.
- **Merge into AGENTS/docs**: if content is policy/reference rather than implementation technique.

## Planned skill decisions

| Planned skill              | Decision      | Why                                                                                                   |
| -------------------------- | ------------- | ----------------------------------------------------------------------------------------------------- |
| `react-component-patterns` | ditch         | Largely covered by base model capability + `vercel-react-best-practices`; high redundancy.            |
| `react-state-management`   | ditch         | Substantially overlaps with existing React skill and current model priors.                            |
| `react-derived-state`      | keep (narrow) | Keep only as a compact anti-pattern skill if this repo repeatedly regresses on derived-state storage. |
| `web-accessibility`        | keep (narrow) | Keep only if it encodes repeatable implementation/testing checklist beyond generic WCAG reminders.    |
| `zod-validation-patterns`  | keep (narrow) | Retain if project uses specific schema/error conventions that are not inferable from one file read.   |

## Net effect on migration scope

- Remove two planned React-general skills from scope.
- Keep at most three narrowly scoped skills:
  - `react-derived-state` (anti-pattern focused)
  - `web-accessibility` (implementation checklist focused)
  - `zod-validation-patterns` (repo convention focused)
- Move broad React guidance to:
  - local/root `AGENTS.md` constraints when non-discoverable,
  - existing pre-installed skills when task intent matches,
  - codebase discovery for everything else.

## Guardrails for creating any new skill

- Require at least one concrete failure mode that existing model + existing skills do not prevent.
- Require a compact, deterministic workflow (not broad best-practice prose).
- If no unique failure mode exists, do not create the skill.
