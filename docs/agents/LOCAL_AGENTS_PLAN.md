# Local AGENTS.md Plan

This plan defines directory-scoped `AGENTS.md` files so local constraints are always-on where they matter and absent elsewhere.

## Scope and ownership

- `src/components/AGENTS.md`: UI/component-level constraints.
- `src/stores/AGENTS.md`: state/persistence constraints.
- `scripts/AGENTS.md`: script execution and data-update constraints.

## 1) `src/components/AGENTS.md`

### Keep

- Project icon policy: use `lucide-react` only (no UTF symbols).
- Icon sizing conventions used in this codebase.
- Component accessibility landmines that are specific to existing UI patterns.

### Exclude

- Generic React best practices.
- Generic WCAG explanations.
- Large UI architecture descriptions.

### Source mapping

- `icon-usage.mdc` (primary)
- `accessibility.mdc` (only project-specific caveats)
- `ui-components.mdc` (only concrete local caveats, not product spec)

## 2) `src/stores/AGENTS.md`

### Keep

- Store-level persistence constraints and invariants.
- Rules preventing accidental coupling between encounter logic and team slot updates.
- Non-obvious state update hazards tied to existing store architecture.

### Exclude

- Generic state-management advice.
- General React hook guidance.
- Domain background unrelated to store safety.

### Source mapping

- `data-persistence.mdc` (primary)
- `team-member-selection-architecture.mdc` (critical architecture caveat)

## 3) `scripts/AGENTS.md`

### Keep

- Script conventions required in this repo (inputs/outputs, error handling expectations, progress reporting style).
- Non-obvious safety constraints for updating generated or scraped data files.
- Validation command expectations after script changes.

### Exclude

- Generic JavaScript/TypeScript coding style.
- Full scraper implementation tutorials.
- Domain mechanics detail.

### Source mapping

- `scraping-scripts.mdc` (primary)
- `pokemon-data.mdc` (only script-relevant source-of-truth constraints)

## Authoring constraints for all local AGENTS files

- Keep each file <= 25 lines.
- Only include non-discoverable local constraints.
- Use short imperative bullets.
- Avoid duplicate rules across root and local AGENTS files.
- Link to `docs/agents/domain/` for any domain explanation.

## Acceptance criteria

- Each local AGENTS file contains only directory-scoped constraints.
- No generic best-practice prose remains.
- No rule duplicated in more than one AGENTS file unless explicitly required.
- Every included rule maps to at least one known failure mode in that directory.
