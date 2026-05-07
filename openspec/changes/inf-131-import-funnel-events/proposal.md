## Why

Import is a critical lifecycle entrypoint but current telemetry does not capture import success or failure outcomes. This blocks visibility into adoption, failure rates, and which failure stages create user friction.

## What Changes

- Add import funnel events: `playthrough_imported` and `playthrough_import_failed`.
- Define normalized, bounded failure taxonomy fields for import failures.
- Require import instrumentation ownership at canonical import domain flow to avoid UI-surface drift.

## Capabilities

### Modified Capabilities
- `analytics-event-contract-v2`: Adds import funnel event requirements and normalized failure taxonomy fields.

### New Capabilities
- None.

## Impact

- Primary touched paths are import flow logic in `usePlaythroughImportExport` and/or canonical store import operations.
- Enables reliable funnel analysis for success rate, failure stage distribution, and high-frequency error categories.
- No persisted data migration required; telemetry contract expansion only.
