# Add Fallow Graph Quality Gate

**Status:** accepted
**Date:** 2026-06-06

## Context

The project already gates formatting, linting, type checking, and tests. Those checks do not cover repository-level graph issues such as newly introduced unresolved imports, unlisted dependencies, dead-code drift, circular dependencies, duplication, or complexity hotspots.

Fallow provides deterministic static analysis for those repo-level signals and has a PR audit mode that attributes findings to the current changeset. That matters because the repository may already contain inherited findings, and adopting a new tool should not turn old cleanup work into an immediate merge blocker.

## Decision

Add Fallow as an incremental graph-quality gate. The initial policy uses `audit.gate = "new-only"`, fails on unresolved imports and unlisted dependencies, and reports likely-noisy cleanup findings as warnings while the project learns the tool's output.

Wire the gate into the existing code-quality path rather than replacing TypeScript, Vitest, or Biome. CI runs `pnpm run validate` first and then runs `pnpm exec fallow audit` with an explicit base ref. Worktrunk pre-merge hooks run `pnpm run quality:graph` after type-checking and tests.

Install Fallow's agent guidance so local agents run `pnpm exec fallow audit --format json --quiet --explain` before commit or push and treat only `fail` verdicts as blockers.

## Alternatives Considered

Running Fallow only in CI would keep local workflows lighter, but it would make graph-quality failures slower to discover. Adding it to pre-commit would catch issues earlier, but it would add overhead to small commits and duplicate the existing lint-staged path.

Making every Fallow rule an error would enforce a cleaner target state immediately, but it risks blocking unrelated work on inherited or false-positive findings. Starting with `new-only` gating keeps the adoption focused on preventing new issues.

## Consequences

New unresolved imports and unlisted dependencies can block local pre-merge checks and CI. Dead-code, duplication, and complexity findings are visible during adoption without immediately blocking merge unless the configured severity is promoted later.

CI code-quality jobs need full git history so `fallow audit` can compare against the PR base accurately. Fallow cache data stays local under `.fallow/` and is ignored by git.
