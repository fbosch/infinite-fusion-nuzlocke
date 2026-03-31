# CI and Build-Minute Baseline (2026-03-31)

This baseline supports `INF-113` and focuses on observable metrics we can fetch from repo config, Vercel deployment APIs, and GitHub Actions APIs.

## Data sources

- Repo config: `.vercel/project.json`, `vercel.json`, `.github/workflows/*.yml`
- Vercel MCP:
  - `vercel_get_project`
  - `vercel_list_deployments`
- GitHub API via `gh`:
  - `GET /repos/fbosch/infinite-fusion-nuzlocke/actions/runs`
  - `GET /repos/fbosch/infinite-fusion-nuzlocke/actions/runs/{run_id}/timing`
  - `GET /users/fbosch/settings/billing/actions` (permission blocked in current auth)

## Environment facts

- Vercel project id: `prj_fFdoZs6v7okre51gSnPvM2vYxhS8`
- Vercel team id: `team_N94nLdxsuwUgVy1FbR1scWkh`
- Vercel framework: `nextjs`
- Vercel Node runtime: `22.x`
- Local `vercel.json` sets:
  - `git.deploymentEnabled.master = false`

## Preview deployment status (non-master branches)

Preview deployments are currently enabled for non-`master` branches.

Evidence:

- `vercel.json` only disables `master`.
- Vercel deployment history shows frequent non-production deploys (`target: null`) with branch refs in `meta.githubCommitRef` such as feature and fix branches.

Conclusion:

- `master` auto deploy is disabled.
- Non-`master` git-triggered previews are active.

## Vercel deployment split (sampled)

Snapshot from the latest 40 deployments (two API pages captured during this audit):

- Production deployments (`target: production`): **2**
- Preview deployments (`target: null`): **38**
- Split: **95% preview / 5% production** in the sampled window

Notes:

- This is an exact count for the sampled 40 deployments.
- This is not a full monthly total yet; full-month extraction needs deeper pagination and/or Vercel usage export.

## GitHub Actions baseline (March 2026)

From workflow runs created between `2026-03-01` and `2026-03-31`:

- Total workflow runs: **600**
- Approximate runtime (from `run_started_at` to `updated_at`): **430.1 minutes**

Workflow run counts:

- `CI`: 182
- `.github/workflows/pr-coverage.yml`: 237
- `Test Coverage`: 130
- `Release Please`: 47
- `Copilot code review`: 4

Important caveat:

- GitHub billing endpoint (`/users/fbosch/settings/billing/actions`) returned `404` with scope hint requiring `user` scope. This session cannot read account-level included/used minutes.

## Build machine and billing model

Current blockers in this session:

- Build machine tier (Standard / Enhanced / Turbo) is not exposed by available MCP responses.
- Vercel build-minute billing totals are not exposed by the used endpoints here.

Action needed to close this gap:

1. Open Vercel project/team Usage and Build settings in the dashboard.
2. Record exact monthly build minutes and machine tier.
3. Attach screenshots or exported numbers to `INF-113`.

## Recommendation

Based on this baseline, keep preview behavior from burning Vercel build minutes by choosing one of:

1. Disable Vercel git previews entirely, or
2. Keep preview URLs but move builds to GitHub Actions and deploy with `vercel deploy --prebuilt`.

Given the sampled 95% preview share, preview strategy changes are likely the biggest lever.
