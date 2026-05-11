## ADDED Requirements

### Requirement: Deep encounter transition operations own rule-safe mutation behavior
The system MUST expose canonical encounter transition operations that own ordering and side effects for encounter mutation workflows.

#### Scenario: Encounter mutation path uses canonical deep transition ownership
- **WHEN** a caller initiates encounter creation, status transition, fusion change, drag/drop mutation, or cleanup behavior
- **THEN** the path routes through canonical deep transition operations
- **AND** callers are not required to reconstruct side-effect sequencing externally

### Requirement: Deep transition behavior remains parity-safe
The system MUST preserve current observable behavior while deepening encounter transition ownership.

#### Scenario: Observable run-state outcomes remain unchanged after deepening
- **WHEN** canonical transition operations process tracked encounter workflows
- **THEN** encounter, team, and graveyard observable outcomes remain behaviorally equivalent to prior implementation
- **AND** required event emission semantics remain equivalent

#### Scenario: Helper-level tests do not replace behavior-level verification
- **WHEN** verification is updated for deep transition ownership
- **THEN** tests prioritize observable outcomes through canonical operations
- **AND** shallow helper tests that only mirror internal implementation detail are replaced or removed
