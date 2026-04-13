## Context

The repository currently carries Node runtime declarations in multiple places (local engine hints, CI workflow setup, and deployment runtime settings). The INF-97 migration needs one baseline policy so local, CI, and deployed behavior stay consistent.

## Goals / Non-Goals

**Goals:**
- Move runtime baseline references from Node 22 to Node 24 in all in-scope config surfaces.
- Enforce a repeatable verification path on Node 24 before merge.
- Provide an explicit rollback plan that restores Node 22 safely if blocking incompatibilities are found.

**Non-Goals:**
- No unrelated dependency upgrades or refactors.
- No runtime feature adoption work beyond version baseline alignment.
- No broad CI redesign outside runtime pin migration.

## Decisions

- **Single baseline policy:** Use Node 24 as the required baseline for active development and CI. This removes split-runtime ambiguity and aligns validation results.
- **Audit-first execution:** Build a checklist of all runtime pins before edits. This prevents partially migrated configurations.
- **Gate on standard validation order:** Run `pnpm type-check`, then `pnpm test:run`, then `pnpm validate` on Node 24 to match repo policy and reduce false confidence.
- **Include deployment runtime control point:** Treat deployment runtime pinning as in-scope, including non-repo project runtime settings when applicable.
- **Deterministic rollback:** Keep rollback as a documented reverse checklist over the same runtime pin set.

## Risks / Trade-offs

- **Dependency incompatibility on Node 24** -> Mitigation: run targeted compatibility checks before broad validation and record blocking packages.
- **Hidden runtime pin missed during migration** -> Mitigation: use a single inventory checklist and completion verification step.
- **CI and deployment using different Node versions** -> Mitigation: verify both workflow runtime declarations and platform runtime settings in the same change.
- **Rollback not exercised** -> Mitigation: include rollback verification criteria in migration notes.

## Migration Plan

1. Confirm target policy: strict Node `24.x` baseline and rollback trigger conditions.
2. Inventory runtime pins across local config, CI workflows, and deployment settings.
3. Update runtime declarations to Node 24 using the checklist.
4. Run targeted smoke checks followed by full validation sequence on Node 24.
5. Confirm CI required checks pass on Node 24 and no engine mismatch warnings remain.
6. Publish migration notes with exact rollback steps and validation criteria.

## Open Questions

- Should temporary dual-lane CI (`22.x` + `24.x`) be required during transition, or only Node 24 once migration lands?
- Does deployment have any external runtime pin outside repo config that must be updated manually each release?
