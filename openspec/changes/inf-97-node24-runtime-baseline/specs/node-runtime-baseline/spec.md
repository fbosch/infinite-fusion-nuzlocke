## ADDED Requirements

### Requirement: Node baseline is uniformly pinned
The project MUST define Node `24.x` as the runtime baseline across all in-scope local, CI, and deployment runtime declarations.

#### Scenario: Local runtime declaration alignment
- **WHEN** runtime pin files are audited after migration
- **THEN** each in-scope local runtime declaration references Node `24.x`

#### Scenario: CI runtime declaration alignment
- **WHEN** active CI workflows are inspected after migration
- **THEN** each Node setup declaration used for required checks references Node `24.x`

#### Scenario: Deployment runtime alignment
- **WHEN** deployment runtime configuration is reviewed for the target environment
- **THEN** the deployment runtime baseline is set to Node `24.x`

### Requirement: Migration verification gates are mandatory
The migration MUST be considered complete only after the standard validation workflow passes on Node `24.x` and engine mismatch warnings are absent.

#### Scenario: Standard validation sequence passes
- **WHEN** migration validation is executed on Node `24.x`
- **THEN** `pnpm type-check`, `pnpm test:run`, and `pnpm validate` all pass

#### Scenario: Engine warning removal is verified
- **WHEN** dependencies are installed in a supported local setup
- **THEN** no engine mismatch warning is emitted for the Node baseline

### Requirement: Rollback path is documented and executable
The migration MUST include rollback instructions that restore the prior Node baseline across all migrated runtime declarations.

#### Scenario: Rollback checklist completeness
- **WHEN** migration notes are reviewed
- **THEN** they list each runtime declaration changed and the exact rollback target value

#### Scenario: Rollback validation criteria exists
- **WHEN** rollback instructions are read
- **THEN** they include post-rollback validation steps that confirm runtime consistency and CI health
