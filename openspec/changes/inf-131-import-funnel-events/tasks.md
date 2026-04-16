## 1. Import funnel contract

- [ ] 1.1 Extend telemetry v2 event contract with `playthrough_imported` and `playthrough_import_failed` definitions.
- [ ] 1.2 Define bounded enums for `failure_stage` and `error_category`.
- [ ] 1.3 Define bounded source/context fields for import payloads and prohibit raw error-message fields.

## 2. Canonical instrumentation

- [ ] 2.1 Instrument canonical import success path to emit `playthrough_imported` once per successful completion.
- [ ] 2.2 Instrument canonical import failure branches to emit `playthrough_import_failed` with normalized taxonomy values.
- [ ] 2.3 Ensure UI surfaces route through canonical instrumentation ownership (no divergent per-surface semantics).

## 3. Verification

- [ ] 3.1 Add tests that assert import success/failure events emit with required fields.
- [ ] 3.2 Add tests that assert failure branches map to normalized `failure_stage` and `error_category` values.
- [ ] 3.3 Run targeted validation for touched files (lint, type-check, and focused tests).
