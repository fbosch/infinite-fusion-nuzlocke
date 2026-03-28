# Pokemon Data

## Critical invariants

- Base Pokemon source-of-truth must remain consistent across loaders, stores, and scripts.
- Data ingestion must be deterministic for the same source inputs.
- Fusion-capable roster assumptions must align with project domain docs.
- Failed fetch/parse steps must not silently produce partial trusted data.

## Implementation implications

- Validate scraped or fetched payloads before persistence.
- Keep explicit error paths for network, parse, and schema failures.
- Cache and retry behavior must not change canonical IDs or identity mapping.
- Script outputs should be stable and diff-friendly for review.

## Common mistakes

- Mixing API-derived IDs with project-local identifiers without mapping.
- Accepting malformed external payloads into typed internal structures.
- Updating generated data files without re-running dependent validations.

## Cross-references

- `docs/agents/domain/fusion-mechanics.md`
- `docs/agents/domain/ui-components.md`
- `scripts/AGENTS.md`
