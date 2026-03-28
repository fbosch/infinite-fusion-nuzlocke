# Valtio + React Compiler Guidance

This guide defines the default subscription pattern for Valtio stores in this repo.

## Recommended Pattern

- Use `useSnapshot` by default for component subscriptions.
- Switch to `useValtioSync` (or `useValtioMapSync`) only when React Compiler compatibility becomes a concrete issue for that read path.
- Keep writes in event handlers/store actions; treat selectors as read-only.

## Decision Rules

1. Start with `useSnapshot(store)` for normal component reads.
2. If a component path needs explicit `useSyncExternalStore` semantics for compiler compatibility, use `useValtioSync(store, selector)`.
3. For `proxyMap`-style access patterns, prefer `useValtioMapSync`.

## Caveats

- Selectors passed to `useValtioSync` must be pure and side-effect free.
- Keep selectors narrow (return exactly what the component needs).
- Avoid returning freshly allocated objects/arrays from selectors unless needed; prefer primitives or stable references where practical.
- Do not mix read subscriptions with mutation logic in the same selector path.

## Examples

Default component subscription:

```ts
const settings = useSnapshot(settingsStore);
```

Compiler-compatible subscription when needed:

```ts
const variant = useValtioSync(
  preferredVariants,
  () => getPreferredVariant(headId, bodyId) ?? "",
  "",
);
```

## References

- `src/hooks/useValtioSync.ts`
- `src/hooks/useSprite.ts`
