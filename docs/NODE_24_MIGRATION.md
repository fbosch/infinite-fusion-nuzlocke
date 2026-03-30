# Node 22 Runtime Baseline

This project now standardizes on Node.js 22 for local development, CI, and release automation.

## Runtime Pins

- `package.json` engines -> `"node": "22.x"`
- `.nvmrc` -> `22`
- GitHub Actions workflows -> `actions/setup-node` uses `node-version: '22'`

## Setup Steps

1. Install Node 22 (recommended via `nvm`):

```bash
nvm install 22
nvm use 22
```

2. Verify runtime and package manager:

```bash
node --version
pnpm --version
```

3. Reinstall dependencies and run validation:

```bash
pnpm install --frozen-lockfile
pnpm type-check
pnpm test:run
pnpm validate
```

## Upgrade Plan

If a future Node upgrade is required for CI, Vercel builds, or tooling:

1. Update runtime pins together:
   - `package.json` engines
   - `.nvmrc`
   - all `actions/setup-node` entries
2. Re-run `pnpm install --frozen-lockfile` and validation checks.
3. Open a follow-up issue with failing command output and environment details.

## Notes

- Vercel deployment runtime is inferred from project toolchain and build environment; keeping `package.json` engines aligned with CI is the source of truth.
- Keep `pnpm` on the existing major baseline (`10.x`) unless a separate upgrade task is approved.
