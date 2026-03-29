# Release Policy

This policy defines how production releases are created for the Infinite Fusion Nuzlocke Tracker.

## Release Trigger

- Releases are cut from `master` through Release Please (`.github/workflows/release-please.yml`).
- Trigger is manual in practice: a maintainer decides to merge the Release Please PR.
- Merging the Release Please PR creates the git tag and GitHub Release automatically.
- `workflow_dispatch` can be used to manually run Release Please if a release PR needs to be generated or refreshed.

## SemVer Rules

Use SemVer for app release versions (`MAJOR.MINOR.PATCH`).

- **Patch**: bug fixes and maintenance with no new user-facing capability and no breaking compatibility.
- **Minor**: backward-compatible user-facing functionality (new features/flows).
- **Major**: breaking changes to user-facing behavior or compatibility contracts.

Concrete examples for this app:

- **Patch (`x.y.Z`)**
  - Fix keyboard navigation to always scroll to the latest encounter.
  - Correct release/deploy workflow docs without behavior changes.
- **Minor (`x.Y.z`)**
  - Add a new run-management feature (for example, new filtering/sorting options in encounter history) without breaking existing playthrough data.
  - Add new optional fields to import/export payloads while keeping older payloads valid.
- **Major (`X.y.z`)**
  - Introduce a breaking import/export format change that older app versions cannot read.
  - Remove or redefine persisted playthrough data fields without backward compatibility/migration support.

## Required Checks Before Release

Before merging a release PR, required CI checks on `master` must be green:

1. `CI / Test Suite`
2. `CI / Type Check`
3. `CI / Code Quality`
4. `CI / Release Gate`

Maintainers should also run local preflight checks for risky changes before release:

```bash
pnpm type-check
pnpm test:run
pnpm validate
```

## Ownership and Approval

- Release authority: repository maintainers, with final responsibility held by the repository owner.
- A release PR should have at least one maintainer approval before merge.
- If the repository owner is the only available maintainer, owner merge is allowed once required checks pass.
- Releases should not be merged while required checks are failing or while open blockers are unresolved.

## Cadence

- No fixed calendar cadence is required.
- Default cadence is batched, demand-driven releases: merge release PRs when enough validated value has accumulated (features/fixes/docs tied to release outcomes).
- Urgent hotfixes can be released immediately by merging the release PR after required checks pass.
