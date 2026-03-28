---
name: react-derived-state
description: Prevent React derived-state regressions and effect-sync loops. Use when editing `useState`/`useEffect`/selectors, adding filtering/sorting/formatting logic, or debugging stale UI caused by duplicated state.
---

# React Derived State

Use this skill to avoid stale UI and state sync loops caused by storing computed values in state.

## Failure modes this prevents

- `useEffect` + `setState` mirrors filtered/sorted/formatted values from other state.
- Duplicated source of truth where both `allItems` and `filteredItems` live in state.
- Dispatch cycles in selection flows where derived lists are re-written to state.

## NEVER

- NEVER store values that can be recomputed from props/state in `useState`; this creates stale mirrors.
- NEVER use `useEffect` only to copy or transform existing state into another state variable.
- NEVER dispatch derived collections into context/store unless they are required as persisted canonical state.
- NEVER suppress dependency warnings to "stabilize" derived calculations; fix canonical inputs instead.

## Workflow

1. Identify canonical inputs (store data, props, user query, sort key).
2. Mark any value that can be recomputed from those inputs as derived.
3. Replace derived `useState`/`useEffect` with `useMemo` in render scope.
4. Keep state/actions for user intent only (query, selected id, sort mode), not computed collections.
5. Re-check dependencies to ensure memoized derivation tracks all canonical inputs.

If a derivation is too expensive for render:

- First optimize the derivation (`useMemo`, indexing, pre-grouping by key).
- If still expensive, move computation to a selector/helper that takes canonical inputs and returns derived data.
- Persist results only when they must survive outside render (for example export snapshots), not for normal UI filtering.

If replacing derived state changes behavior:

- Compare old/new outputs for the same canonical inputs.
- Fix hidden input omissions (common: missing route filters, active-team exclusions, or mode toggles).

## Rewrite pattern

```tsx
// Before: derived state stored and synchronized
const [filtered, setFiltered] = useState(items);
useEffect(() => {
  setFiltered(filterItems(items, query));
}, [items, query]);

// After: derive locally
const filtered = useMemo(() => filterItems(items, query), [items, query]);
```

## Fast review checks

- Search for `useEffect` blocks that only call `setState` with transformed existing values.
- Search for paired state like `rawX` + `computedX` where `computedX` has no independent user intent.
- Ensure derived lists/stats are computed from canonical inputs at read time.

## Repo anchors

- `src/components/team/TeamMemberSelectionContext.tsx`
- `src/components/team/TeamMemberSelectionPanel.tsx`
