---
name: web-accessibility
description: Enforce high-risk accessibility invariants for interactive React UI. Use when implementing/refactoring clickable wrappers, icon-only controls, sortable tables, dialogs, keyboard flows, or live status updates.
---

# Web Accessibility

Use this skill for concrete implementation checks, not generic WCAG prose.

## Failure modes this prevents

- Clickable non-button elements without keyboard parity.
- Icon-only actions missing accessible names.
- Sortable headers lacking `aria-sort` and keyboard activation.
- Modal and async status updates not announced properly.

## NEVER

- NEVER ship `div`/`span` click targets without full keyboard parity; use semantic buttons first.
- NEVER rely on color or icon shape alone to convey status/action meaning.
- NEVER use icon-only controls without explicit `aria-label`.
- NEVER mark decorative icons as accessible content; use `aria-hidden='true'` when decorative.
- NEVER open dialogs without label association and predictable focus behavior.

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

If a custom wrapper can be replaced by semantic HTML, replace it; do not keep wrapper + ARIA unless required.

If keyboard behavior is uncertain, implement the minimum deterministic contract:

- Enter and Space activate the same action as click.
- Focus indicator is visible in default keyboard navigation.
- Escape closes dismissible dialogs and returns focus to trigger when possible.

## Quick review checks

- Search for `onClick` on non-semantic elements and verify keyboard parity.
- Search for icon-only controls and verify `aria-label` is present.
- Verify status regions that change over time are announced.

## Deterministic review order

1. Interactive semantics (`button`/`a`/wrapper parity)
2. Keyboard parity (`tabIndex`, Enter/Space handlers, focus visibility)
3. Naming (`aria-label`, labelledby/describedby correctness)
4. Stateful semantics (`aria-sort`, expanded/pressed/selected states)
5. Dynamic announcements (loading/error/success live-region behavior)

## Repo anchors

- `src/components/LocationTable/SortableHeaderCell.tsx`
- `src/components/team/TeamSlots.tsx`
- `src/components/PokemonCombobox/PokemonEvolutionButton.tsx`
- `src/components/playthrough/PlaythroughSelector.tsx`
