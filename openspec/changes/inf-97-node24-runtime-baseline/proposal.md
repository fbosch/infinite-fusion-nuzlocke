## Why

The project runtime baseline is pinned to Node 22 while active development and CI expectations are shifting to Node 24. This drift causes engine warnings, inconsistent validation behavior, and avoidable deployment risk.

## What Changes

- Standardize the runtime baseline to Node 24 across local development, CI workflows, and deployment configuration.
- Define explicit migration and rollback rules so runtime upgrades remain reversible and auditable.
- Add verification requirements for engine warning elimination and end-to-end validation on Node 24.

## Capabilities

### New Capabilities
- `node-runtime-baseline`: Defines normative requirements for runtime pin alignment, verification gates, and rollback guarantees for Node baseline upgrades.

### Modified Capabilities
- None.

## Impact

- Affected files include runtime pins in `package.json`, toolchain version files, CI workflow definitions, and deployment runtime config.
- Validation workflow is explicitly tied to `pnpm type-check`, `pnpm test:run`, and `pnpm validate` on the target runtime.
- Deployment/runtime operations require one documented source of truth and a rollback sequence.
