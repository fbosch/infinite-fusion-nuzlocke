## MODIFIED Requirements

### Requirement: Transition and source semantics use normalized field conventions
The system MUST standardize lifecycle transition fields as `previous_*` and `new_*` pairs, and source fields through explicit bounded enums.

#### Scenario: Equivalent semantic transitions are source-agnostic at event identity level
- **WHEN** the same domain transition is initiated from different UI surfaces
- **THEN** emitted telemetry uses the same canonical event id and required transition field semantics
- **AND** surface differences are encoded only through bounded source metadata fields

### Requirement: Domain operations are canonical analytics emit points
The system MUST assign analytics event emission ownership to canonical store/domain operations for each semantic action.

#### Scenario: Team context menu and table flows remain semantically consistent
- **WHEN** team context menu and location table trigger equivalent domain actions
- **THEN** both paths route through canonical domain operations
- **AND** analytics emission semantics are equivalent for event id and required fields

#### Scenario: Direct UI bypass of canonical emit ownership is rejected
- **WHEN** a UI path mutates run-state for a tracked semantic action without canonical domain emit behavior
- **THEN** verification fails and merge is blocked until the path is routed through canonical operation ownership
