## Context

The scraper pipeline fetches external wiki content, maps it into project data shapes, and writes generated JSON files that application runtime treats as trusted input. Current script-level checks catch some parse failures, but the output boundary needs a consistent validation contract before persistence and a migration parity gate when scraper implementations change.

The implementation must keep script output deterministic, preserve existing generated data semantics, and fail loudly with actionable paths for schema or identity errors.

## Goals / Non-Goals

**Goals:**

- Validate scraper output payloads at the write boundary before generated files are persisted.
- Preserve issue/path details for schema failures so broken source rows can be diagnosed quickly.
- Gate migration-sensitive scraper changes against baseline aggregates for route count, encounter count, Pokemon ID integrity, and encounter type integrity.
- Keep validation commands visible for future scraper maintenance.

**Non-Goals:**

- Rebuild every scraper script in one pass.
- Change runtime encounter contracts or generated data semantics.
- Add a new dependency or external validation service.
- Replace existing targeted parser tests.

## Decisions

1. Use Zod at scraper output boundaries.

   Zod is already a project dependency and matches the repository boundary-validation pattern. This avoids adding another schema tool while still preserving structured issue paths. Alternative considered: handwritten validators. Handwritten checks are smaller for one shape but become inconsistent across scraper outputs and are easier to under-specify.

2. Validate before writes, not after writes.

   The write boundary is the last point where raw scraped output can be rejected without mutating trusted generated files. Alternative considered: validate generated files in a separate command after the scraper completes. That detects failures later but can leave the working tree with invalid output.

3. Keep parity checks aggregate-based during migration.

   Route count, encounter count, Pokemon ID set, and encounter type set catch structural and identity regressions without blocking intentional ordering or formatting changes. Alternative considered: full JSON equality. Full equality is too strict for scraper refactors that preserve semantics while improving deterministic ordering or formatting.

4. Use existing Pokemon identity maps for ID integrity.

   The project already has canonical Pokemon ID/name data loaders for scraper scripts. Reusing them keeps identity validation aligned with current generated data assumptions. Alternative considered: only enforce positive integer IDs. That would miss unknown or unmapped Pokemon IDs.

## Risks / Trade-offs

- Baseline drift can make parity checks noisy if upstream wiki data legitimately changes -> Mitigation: review the parity failure, update generated outputs intentionally, and rerun targeted scraper validation before broader checks.
- Aggregate parity can miss route-local movement when global counts and sets stay equal -> Mitigation: retain focused parser tests for route scoping and add route-specific tests for known migration risks.
- Validating only one scraper first leaves other generated outputs with older validation patterns -> Mitigation: keep helpers local and migrate additional scraper outputs incrementally when their scripts change.
- Network-backed scraper validation can be flaky when wiki access is unavailable -> Mitigation: keep parser/unit validation separate from network refresh commands and run the network scraper only when output behavior is in scope.
