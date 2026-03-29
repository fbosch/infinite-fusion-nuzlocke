# Release Gates

This repository uses `master` as the default branch for CI and release automation.

## Branch trigger strategy

- CI workflows that gate releases run on `push` and `pull_request` events targeting `master`.
- Scheduled maintenance jobs are limited to `schedule` and `workflow_dispatch` events.

## Required release checks

Configure branch protection for `master` to require these checks:

1. `CI / Test Suite`
2. `CI / Code Quality`
3. `CI / Release Gate`

`CI / Release Gate` is an enforcement job that fails when upstream required jobs do not pass.

## Coverage workflows

- `Test Coverage` and `PR Coverage Report` follow the same `master` branch strategy.
- Coverage jobs are informational and should not replace required release gates unless explicitly promoted.

## Production deploy gate

- Git-triggered Vercel deployments from `master` are disabled via `vercel.json`:
  - `git.deploymentEnabled.master = false`
- This prevents automatic production deploys on every merge to `master`.
- Production deploys run from the `deploy-production` job in `.github/workflows/release-please.yml`.
- The release deploy workflow requires repository secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.

Version ownership boundaries between app SemVer and persisted schema markers are documented in `docs/VERSION_BOUNDARIES.md`.
