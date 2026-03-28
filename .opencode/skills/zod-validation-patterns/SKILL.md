---
name: zod-validation-patterns
description: Apply repository Zod boundary-validation conventions with consistent error shapes. Use when changing API handlers, loaders, localStorage/persistence flows, import/export parsers, or legacy payload migrations.
---

# Zod Validation Patterns

Use this skill to keep invalid data from entering stores and to make failures diagnosable.

## Scope

- Apply at untrusted-data boundaries: API inputs, external fetch payloads, localStorage, import/export payloads, and migration transforms.
- Skip for internal trusted objects unless explicitly asserting invariants.

## Failure modes this prevents

- Accepting unvalidated API/localStorage/import payloads into state.
- Throw-based parse flows that hide issue paths and block graceful recovery.
- Inconsistent error shape between loaders, API routes, and stores.

## NEVER

- NEVER call `.parse` on untrusted input in normal request/load paths; it removes controlled recovery.
- NEVER pass raw payloads into store mutations before schema validation succeeds.
- NEVER drop `issues` path details when surfacing validation errors.
- NEVER mix success/error response shapes for the same boundary contract.

## Boundary decision tree

- API request params/body/query -> validate immediately in route handler before business logic.
- External fetch payload -> validate in loader/service adapter before mapping.
- localStorage/import file payload -> validate before merge/update operations.
- Internal trusted objects -> schema optional, use only when invariants are being asserted.

## Workflow

1. Define or reuse schema at the boundary where untrusted data enters.
2. Use `safeParse` for normal control flow.
3. On failure, return/throw a contextual error that preserves `issues` path data.
4. On success, propagate only parsed `data`.
5. Add or update tests for valid, invalid, and legacy-format payloads.

## Fallbacks

If validation fails for a backward-compatible format:

- Attempt explicit legacy schema parse.
- Transform to current canonical shape.
- Re-validate transformed output with current schema before use.

If both current and legacy schema fail:

- Reject payload and include a compact issue summary keyed by path.
- Avoid partial merges; keep last known good state intact.

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

## Error-shape contract

Use one boundary error shape consistently:

```ts
type ValidationSuccess<T> = {
  ok: true;
  data: T;
};

type ValidationFailure = {
  ok: false;
  message: string;
  issues: { path: (string | number)[]; message: string }[];
};

type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;
```

## Fast review checks

- Search for `.parse(` on untrusted inputs and replace with controlled `safeParse` flow.
- Verify every boundary returns the same success/error envelope shape.
- Confirm tests include legacy payloads when migration code exists.

## Repo anchors

- `src/stores/settings.ts`
- `src/stores/playthroughs/persistence.ts`
- `src/app/api/encounters/route.ts`
- `src/app/api/pokemon/route.ts`
