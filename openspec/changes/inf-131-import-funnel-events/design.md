## Context

The import flow currently emits no dedicated events for success or failure. Existing UX toasts expose error text to users but telemetry lacks a contract for stage-level failure attribution.

## Goals

- Make import funnel outcomes observable through explicit success/failure events.
- Standardize failure reporting with bounded fields so queries remain stable.
- Keep instrumentation at canonical import operation boundaries, not scattered UI branches.

## Non-Goals

- Refactoring the entire import architecture.
- Capturing raw error messages or PII in analytics payloads.
- Introducing compatibility aliases for legacy event names.

## Decisions

1. Emit `playthrough_imported` exactly once per successful import completion.
2. Emit `playthrough_import_failed` for each failed import attempt with normalized fields:
   - `failure_stage`: one of `file_selection`, `file_read`, `json_parse`, `schema_validation`, `store_import`, `unknown`
   - `error_category`: one of `unsupported_file_type`, `invalid_json`, `invalid_schema`, `duplicate_id`, `storage_failure`, `unexpected`
3. Keep import source/context fields bounded (`import_source`, `has_file`, `file_extension_group`, `mime_group`) and avoid free-form strings.
4. Reject payloads that include unbounded raw error values.

## Validation Strategy

- Add focused tests for import success event emission.
- Add focused tests for failure-stage/category normalization across major failure branches.
- Add schema-level tests ensuring invalid or unbounded failure payloads are blocked.
- Run targeted lint, type-check, and focused analytics/import tests.
