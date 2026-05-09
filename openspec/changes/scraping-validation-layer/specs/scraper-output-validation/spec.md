## ADDED Requirements

### Requirement: Scraper outputs validate before persistence

The system SHALL validate generated scraper payloads against an explicit schema before writing generated data files.

#### Scenario: Valid payload is persisted

- **WHEN** a scraper produces a payload that satisfies the output schema
- **THEN** the scraper writes the generated data file

#### Scenario: Invalid payload is rejected before write

- **WHEN** a scraper produces a payload that violates the output schema
- **THEN** the scraper fails before writing the generated data file

#### Scenario: Schema failure includes issue path

- **WHEN** a scraper payload fails schema validation
- **THEN** the failure message includes the invalid payload path and validation message

### Requirement: Encounter output validates Pokemon ID integrity

The system SHALL reject generated encounter outputs that reference Pokemon IDs missing from the canonical Pokemon identity map.

#### Scenario: Unknown Pokemon ID is rejected

- **WHEN** generated encounter output contains a Pokemon ID absent from the canonical Pokemon identity map
- **THEN** the scraper fails before writing the generated encounter file

### Requirement: Encounter output validates encounter type integrity

The system SHALL reject generated encounter outputs that contain encounter types outside the supported encounter type set.

#### Scenario: Unknown encounter type is rejected

- **WHEN** generated encounter output contains an unsupported encounter type
- **THEN** the scraper fails before writing the generated encounter file

### Requirement: Encounter scraper migration preserves aggregate parity

The system SHALL compare generated encounter output against the current baseline before persistence when migration parity is required.

#### Scenario: Aggregate parity passes

- **WHEN** generated encounter output matches the baseline route count, encounter count, Pokemon ID set, and encounter type set
- **THEN** the scraper may write the generated encounter file

#### Scenario: Route count parity fails

- **WHEN** generated encounter output has a different route count than the baseline
- **THEN** the scraper fails before writing the generated encounter file

#### Scenario: Encounter count parity fails

- **WHEN** generated encounter output has a different encounter count than the baseline
- **THEN** the scraper fails before writing the generated encounter file

#### Scenario: Pokemon ID parity fails

- **WHEN** generated encounter output has a different Pokemon ID set than the baseline
- **THEN** the scraper fails before writing the generated encounter file

#### Scenario: Encounter type parity fails

- **WHEN** generated encounter output has a different encounter type set than the baseline
- **THEN** the scraper fails before writing the generated encounter file

### Requirement: Scraper validation workflow is documented

The system SHALL document the targeted scraper validation commands used during scraper maintenance.

#### Scenario: Maintainer checks scraper changes

- **WHEN** a maintainer changes scraper validation or encounter scraping behavior
- **THEN** the documentation lists the focused scraper test, encounter scraper refresh, and route article coverage commands
