## MODIFIED Requirements

### Requirement: Import funnel outcomes are explicitly tracked
The system MUST emit dedicated analytics events for import success and import failure outcomes.

#### Scenario: Successful import emits canonical success event
- **WHEN** a playthrough import completes and active playthrough state is updated successfully
- **THEN** the system emits `playthrough_imported`
- **AND** payload includes required shared event properties
- **AND** payload includes bounded import context fields

#### Scenario: Failed import emits canonical failure event
- **WHEN** a playthrough import attempt fails at any supported stage
- **THEN** the system emits `playthrough_import_failed`
- **AND** payload includes required shared event properties where available
- **AND** payload includes normalized `failure_stage` and `error_category` fields

### Requirement: Import failure taxonomy uses bounded normalized fields
The system MUST represent import failures with bounded enum-like values and MUST NOT include raw unbounded error text in analytics payloads.

#### Scenario: Failure branch maps to normalized taxonomy values
- **WHEN** import fails due to invalid JSON, unsupported type, schema mismatch, duplicate id, storage write failure, or unexpected exceptions
- **THEN** emitted failure payload maps each branch to a bounded `failure_stage` and `error_category` value

#### Scenario: Unbounded failure payload fields are rejected
- **WHEN** instrumentation attempts to send failure payloads containing non-contract fields (for example raw exception messages)
- **THEN** payload validation blocks the event and verification fails until payload contract is restored

### Requirement: Canonical import operation owns emit responsibility
The system MUST keep import telemetry emission in canonical import flow operations and not in view-specific branches.

#### Scenario: Multiple UI entry surfaces remain semantically consistent
- **WHEN** different UI surfaces trigger the same import operation
- **THEN** emitted import success/failure semantics are identical for event identity and required fields
