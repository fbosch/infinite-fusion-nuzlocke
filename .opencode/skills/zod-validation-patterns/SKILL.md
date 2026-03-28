---
name: zod-validation-patterns
description: Apply repository Zod validation conventions at API, loader, and persistence boundaries. Use when adding/changing data ingestion, storage, import/export, or request parsing.
---

# Zod Validation Patterns

Use this skill to keep invalid data from entering stores and to make failures diagnosable.

## Failure modes this prevents

- Accepting unvalidated API/localStorage/import payloads into state.
- Throw-based parse flows that hide issue paths and block graceful recovery.
- Inconsistent error shape between loaders, API routes, and stores.

## Workflow

1. Define or reuse schema at the boundary where untrusted data enters.
2. Use `safeParse` for normal control flow.
3. On failure, return/throw a contextual error that preserves `issues` path data.
4. On success, propagate only parsed `data`.
5. Add or update tests for valid, invalid, and legacy-format payloads.

## Boundary pattern

```ts
const result = Schema.safeParse(input);
if (result.success === false) {
  return {
    ok: false,
    message: 'Invalid payload',
    issues: result.error.issues,
  };
}

return { ok: true, data: result.data };
```

## Repo anchors

- `src/stores/settings.ts`
- `src/stores/playthroughs/persistence.ts`
- `src/app/api/encounters/route.ts`
- `src/app/api/pokemon/route.ts`
