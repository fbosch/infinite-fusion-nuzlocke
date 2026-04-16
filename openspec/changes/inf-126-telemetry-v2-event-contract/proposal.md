## Why

Analytics instrumentation is expanding beyond the current v1 contract, but the repo lacks a single normative v2 contract for event naming, required fields, and transition/source conventions. Without a shared contract, new events can drift across payload shape, naming, and emit semantics.

## What Changes

- Define telemetry v2 contract rules for stable event names, required shared properties, and event-specific property constraints.
- Standardize transition field naming (`previous_*`, `new_*`) and source field naming (`source_surface`, `trigger_method`) to prevent schema drift.
- Define contract-first workflow expectations so any new analytics event updates the contract before code emission.

## Capabilities

### New Capabilities
- `analytics-event-contract-v2`: Defines required telemetry schema conventions for event names, shared payload fields, transition/source field patterns, and contract update workflow.

### Modified Capabilities
- None.

## Impact

- Primary touched docs/types are expected in `docs/analytics/event-spec.md` and analytics schema typing in `src/lib/analytics/trackEvent.ts`.
- Follow-up instrumentation issues depend on this contract to keep payloads consistent across domain emit points.
- No persistence migration is required; this is a contract and schema-governance change.
