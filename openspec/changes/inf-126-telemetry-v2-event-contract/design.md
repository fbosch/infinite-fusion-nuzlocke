## Context

Current analytics events already enforce flat payloads and bucketed counters, but upcoming work introduces more transition and source-specific events. The existing contract does not define strict naming and field-shape conventions for these new categories.

## Goals

- Prevent event payload drift as new analytics events are added.
- Keep event design low-cardinality and queryable across lifecycle funnels.
- Enforce contract consistency at typed schema boundaries, not only in prose docs.

## Non-Goals

- Implementing all downstream new events in this change.
- Introducing nested payload objects or dynamic schema fields.
- Adding compatibility shims for unspecified legacy event variants.

## Decisions

1. Keep one normative contract document for taxonomy and buckets (`docs/analytics/event-spec.md`).
2. Require transition properties to use `previous_*` and `new_*` naming pairs for lifecycle events.
3. Require source properties to use bounded enums (`source_surface`, `trigger_method`) with explicit allowed values.
4. Keep payloads flat and primitive-only (`string`, `number`, `boolean`) to preserve analytics backend compatibility.
5. Validate schema in `trackEvent` so invalid payloads fail before emission.

## Validation Strategy

- Add focused tests for schema acceptance/rejection around transition and source field conventions.
- Run scoped lint/test validation for touched analytics modules.
