## Why

Telemetry v2 contract rules exist, but emit ownership still diverges across UI-driven paths. Equivalent user actions can bypass canonical domain emit points, producing inconsistent analytics semantics and incomplete funnels.

## What Changes

- Define canonical emit-point ownership for analytics events at store/domain operations instead of UI call sites.
- Require equivalent semantic actions to emit the same event shape regardless of initiating surface (table, team menu, keyboard, drag/drop).
- Define source attribution as bounded metadata fields, not alternate event names for the same domain transition.

## Capabilities

### Modified Capabilities
- `analytics-event-contract-v2`: Adds canonical emit-point and semantic-equivalence requirements for domain events.

### New Capabilities
- None.

## Impact

- Primary touched code paths are analytics emit call sites in store/domain modules and UI action handlers that currently bypass canonical operations.
- Follow-up instrumentation tickets depend on this normalization to keep lifecycle and team-management funnels query-consistent.
- No data migration required; this is event-governance and emit-path normalization.
