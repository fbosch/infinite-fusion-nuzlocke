## 1. Contract taxonomy and required fields

- [ ] 1.1 Define telemetry v2 naming rules for event ids and event-specific properties.
- [ ] 1.2 Define required shared payload properties and allowed primitive value types.
- [ ] 1.3 Define required field conventions for transition semantics (`previous_*`, `new_*`) and emit-source semantics (`source_surface`, `trigger_method`).

## 2. Contract source-of-truth updates

- [ ] 2.1 Update analytics contract documentation to include v2 rules, canonical fields, and examples.
- [ ] 2.2 Update `trackEvent` schema/types so v2 rules are enforced at compile/runtime boundaries.
- [ ] 2.3 Confirm existing events remain valid under v2 or explicitly document deltas.

## 3. Verification

- [ ] 3.1 Add or update focused tests that fail on contract drift for required fields and naming conventions.
- [ ] 3.2 Run targeted validation for touched analytics files (format, lint, and targeted tests).
