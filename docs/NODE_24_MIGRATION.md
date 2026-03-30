# Node 24 Runtime Migration

This project now standardizes on Node.js 24 for local development, CI, and release automation.

## Updated Runtime Pins

- `package.json` engines -> `"node": "24.x"`
- `.nvmrc` -> `24`
- GitHub Actions workflows -> `actions/setup-node` uses `node-version: '24'`

## Migration Steps

1. Install Node 24 (recommended via `nvm`):

```bash
nvm install 24
nvm use 24
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

## Rollback Plan

If Node 24 introduces regressions in CI, Vercel builds, or local tooling:

1. Revert runtime pins to Node 22:
   - `package.json` engines -> `"node": "22.x"`
   - `.nvmrc` -> `22`
   - all `actions/setup-node` entries -> `node-version: '22'`
2. Re-run `pnpm install --frozen-lockfile` and validation checks.
3. Open a follow-up issue with failing command output and environment details.

## Notes

- Vercel deployment runtime is inferred from project toolchain and build environment; keeping `package.json` engines aligned with CI is the source of truth.
- Keep `pnpm` on the existing major baseline (`10.x`) unless a separate upgrade task is approved.
