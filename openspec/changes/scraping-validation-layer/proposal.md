## Why

Scraper outputs are trusted as generated game data, but malformed fetched or parsed payloads can currently reach persistence unless each script hand-rolls complete validation. A shared validation layer makes scraper migrations safer by failing before writes and by proving aggregate parity against the current baseline when expected.

## What Changes

- Add explicit schema validation for scraper output payloads before generated files are written.
- Add parity gates for migration-safe scraper outputs, including route count, encounter count, Pokemon ID integrity, and encounter type integrity.
- Document the maintenance validation commands needed when changing scraper logic or refreshing generated outputs.
- No breaking runtime API changes.

## Capabilities

### New Capabilities

- `scraper-output-validation`: Contracts for validating generated scraper payloads and gating migration parity before persistence.

### Modified Capabilities

- None.

## Impact

- Affected code: scraper scripts under `scripts/`, focused scraper tests under `tests/`, and maintenance documentation.
- Affected data: generated encounter data files are protected by validation gates, but this change should not require semantic data rewrites.
- Dependencies: uses existing Zod dependency; no new package required.
- Systems: local scraper refresh workflow and CI validation for scraper-related changes.
