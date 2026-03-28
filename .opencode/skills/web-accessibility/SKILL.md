---
name: web-accessibility
description: Enforce high-risk accessibility behaviors for interactive React UI. Use when building or refactoring controls, tables, modals, icon-only actions, or live status regions.
---

# Web Accessibility

Use this skill for concrete implementation checks, not generic WCAG prose.

## Failure modes this prevents

- Clickable non-button elements without keyboard parity.
- Icon-only actions missing accessible names.
- Sortable headers lacking `aria-sort` and keyboard activation.
- Modal and async status updates not announced properly.

## Workflow

1. Confirm semantic element choice first (`button` for actions, `a` for navigation).
2. For any custom interactive wrapper, enforce all of:
   - `role="button"`
   - `tabIndex={0}`
   - `onKeyDown` handling for Enter and Space
3. Ensure icon-only controls have explicit `aria-label`.
4. For sortable table headers, include `aria-sort` and keyboard trigger parity.
5. For dialogs, include `role="dialog"`, `aria-modal`, and label association.
6. For dynamic status/loading/error text, use appropriate live-region semantics.

## Quick review checks

- Search for `onClick` on non-semantic elements and verify keyboard parity.
- Search for icon-only controls and verify `aria-label` is present.
- Verify status regions that change over time are announced.

## Repo anchors

- `src/components/LocationTable/SortableHeaderCell.tsx`
- `src/components/team/TeamSlots.tsx`
- `src/components/PokemonCombobox/PokemonEvolutionButton.tsx`
- `src/components/playthrough/PlaythroughSelector.tsx`
