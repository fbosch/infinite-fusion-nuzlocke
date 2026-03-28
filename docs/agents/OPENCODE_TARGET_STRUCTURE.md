# OpenCode Target Structure

This is the target layout for migrating Cursor rules into OpenCode primitives.

## Directory and file layout

```text
.
|- AGENTS.md
|- .opencode/
|  `- commands/
|     |- test-target.md
|     |- domain-context.md
|     `- validate-changed.md
|- src/
|  |- components/
|  |  `- AGENTS.md
|  `- stores/
|     `- AGENTS.md
|- scripts/
|  `- AGENTS.md
`- docs/
   `- agents/
      |- CURSOR_RULES_MIGRATION_CROSSWALK.md
      `- domain/
         |- nuzlocke-core-rules.md
         |- fusion-mechanics.md
         |- pokemon-data.md
         |- ui-components.md
         `- team-member-selection-architecture.md
```

## Responsibility boundaries

- `AGENTS.md` (root): always-on repo-wide constraints that are not auto-discoverable.
- `src/components/AGENTS.md`: component-level constraints (for example icon rules and UI-specific caveats).
- `src/stores/AGENTS.md`: store and persistence constraints local to state management work.
- `scripts/AGENTS.md`: script-specific operational rules for scraping and data updates.
- `.opencode/commands/*.md`: explicit action workflows chosen by user intent.
- `docs/agents/domain/*.md`: on-demand domain context, not loaded by default.

## Rule for choosing primitive

Use this decision rule during migration:

1. If the guidance is directory-scoped and should always apply there, put it in local `AGENTS.md`.
2. If the guidance is reusable implementation knowledge, migrate it into a skill.
3. If the guidance represents an explicit user-invoked workflow, implement it as a command.
4. If the guidance is domain reference context, place it under `docs/agents/domain/`.
5. If the guidance is Cursor-specific formatting/process, delete it.
