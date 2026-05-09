## 1. Validation Boundary

- [x] 1.1 Define encounter output schemas for route names, Pokemon IDs, encounter types, and non-empty encounter lists.
- [x] 1.2 Add fail-fast validation before generated encounter files are written.
- [x] 1.3 Preserve schema issue paths and messages in thrown validation errors.
- [x] 1.4 Add Pokemon ID integrity validation against the canonical Pokemon identity map.

## 2. Parity Gates

- [x] 2.1 Build encounter parity summaries for route count, encounter count, Pokemon ID set, and encounter type set.
- [x] 2.2 Compare generated encounter output against baseline output before persistence.
- [x] 2.3 Fail before writing when any parity aggregate diverges.

## 3. Tests And Documentation

- [x] 3.1 Add focused tests for invalid Pokemon IDs and parity mismatch failures.
- [x] 3.2 Add or retain parser coverage for route scoping risks that aggregate parity cannot detect.
- [x] 3.3 Document scraper maintenance commands for focused tests, encounter refresh, and route article coverage.

## 4. Validation

- [x] 4.1 Run focused scraper tests.
- [x] 4.2 Run `pnpm type-check`.
- [x] 4.3 Run `pnpm validate`.
- [x] 4.4 Run `pnpm test:run` when scope touches shared scraper behavior.
- [x] 4.5 Run `pnpm scrape:encounters` when validating parity against live scraper output.
