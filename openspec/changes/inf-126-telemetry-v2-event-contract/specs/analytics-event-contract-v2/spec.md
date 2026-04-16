## ADDED Requirements

### Requirement: Telemetry v2 event naming and shape are canonical
The system MUST define telemetry v2 event contracts with stable snake_case event names, flat property maps, and primitive-only values.

#### Scenario: Event names follow canonical naming
- **WHEN** a new telemetry event is introduced
- **THEN** its event id is snake_case and documented in the analytics contract source of truth

#### Scenario: Event payload shape remains flat
- **WHEN** event payload schemas are defined for telemetry v2
- **THEN** properties are flat key-value fields and do not contain nested objects or arrays

### Requirement: Shared telemetry fields are explicitly required
The system MUST define and enforce one required shared field set for telemetry v2 events.

#### Scenario: Shared fields are present on every event
- **WHEN** any telemetry v2 event is emitted
- **THEN** the event payload includes the required shared property set defined by the contract

#### Scenario: Shared fields are validated before emission
- **WHEN** an event payload omits or mistypes a required shared field
- **THEN** schema validation rejects the payload and prevents emission

### Requirement: Transition and source semantics use normalized field conventions
The system MUST standardize lifecycle transition fields as `previous_*` and `new_*` pairs, and source fields through explicit bounded enums.

#### Scenario: Status transition event uses previous/new fields
- **WHEN** an event describes movement between lifecycle states
- **THEN** the payload uses paired `previous_*` and `new_*` fields for the transitioned dimension

#### Scenario: Source context remains bounded
- **WHEN** an event includes source context such as UI entrypoint or trigger mode
- **THEN** the payload uses explicit enum-backed source fields (for example `source_surface` and `trigger_method`) with contract-defined values

### Requirement: Contract-first workflow gates analytics additions
The system MUST update contract artifacts before introducing new telemetry v2 event emissions.

#### Scenario: New event requires contract update first
- **WHEN** implementation proposes a new telemetry v2 event or property
- **THEN** the analytics contract documentation and schema definitions are updated before or with the emit-point change

#### Scenario: Drift is blocked by verification
- **WHEN** telemetry schema or contract conventions drift from implementation
- **THEN** focused verification fails and requires contract/schema alignment before merge
