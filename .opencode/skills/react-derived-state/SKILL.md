---
name: react-derived-state
description: Prevent React derived-state regressions. Use when a change adds or edits state/effect logic and you suspect computed values are being stored instead of derived from canonical inputs.
---

# React Derived State

Use this skill to avoid stale UI and state sync loops caused by storing computed values in state.

## Failure modes this prevents

- `useEffect` + `setState` mirrors filtered/sorted/formatted values from other state.
- Duplicated source of truth where both `allItems` and `filteredItems` live in state.
- Dispatch cycles in selection flows where derived lists are re-written to state.

## Workflow

1. Identify canonical inputs (store data, props, user query, sort key).
2. Mark any value that can be recomputed from those inputs as derived.
3. Replace derived `useState`/`useEffect` with `useMemo` in render scope.
4. Keep state/actions for user intent only (query, selected id, sort mode), not computed collections.
5. Re-check dependencies to ensure memoized derivation tracks all canonical inputs.

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

## Repo anchors

- `src/components/team/TeamMemberSelectionContext.tsx`
- `src/components/team/TeamMemberSelectionPanel.tsx`
