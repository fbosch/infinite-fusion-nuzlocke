# <img src="https://github.com/fbosch/infinite-fusion-nuzlocke/blob/master/src/app/favicon-32x32.png?raw=true" height="27px" width="26px" /> Infinite Fusion Nuzlocke Tracker

Track Pokemon Infinite Fusion Nuzlocke runs with location-based encounter logging, team/PC state management, and fusion-aware workflows.

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-149eca)](https://react.dev/)
[![React Doctor](https://img.shields.io/badge/React_Doctor-100%2F100-brightgreen)](https://github.com/millionco/react-doctor)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Live app: [fusion.nuzlocke.io](https://fusion.nuzlocke.io)

## Features

- Location table for encounters with sorting, quick actions, and recent-encounter navigation.
- Multiple playthrough profiles with create/switch/delete and import/export support.
- Game mode support for Classic, Remix, and Randomized playthroughs.
- Team slot management plus PC/graveyard flows that preserve Nuzlocke run-state invariants.
- Fusion-aware Pokemon handling, including sprite variants and fusion status tracking.
- Custom location support for challenge variants and personalized runs.

## Quick Start

```bash
corepack enable
corepack prepare pnpm@10 --activate
pnpm install
pnpm dev
```

Open [http://localhost:4000](http://localhost:4000).

## Requirements

- Node.js `20.x` (matches CI)
- Corepack-enabled pnpm `10.x` (project uses `pnpm@10`)

## Common Scripts

```bash
# Development
pnpm dev
pnpm build
pnpm start

# Quality
pnpm type-check
pnpm lint
pnpm validate
pnpm react-doctor:badge

# Testing
pnpm test
pnpm test:run
pnpm test:coverage

# Data and assets
pnpm data:refresh
pnpm spritesheet
```

## Tech Stack

- Next.js 16 + React 19
- TypeScript 6
- Valtio for run-state and playthrough state
- TanStack Query for server/cache data
- Zod for runtime validation boundaries
- Tailwind CSS 4 for styling
- Vitest + Testing Library for tests
- Biome for linting and formatting

## Validation Workflow

For changes that touch behavior or state logic, run checks in this order:

```bash
pnpm type-check
pnpm test:run
pnpm validate
```

## Release Workflow

Releases are automated with Release Please via `.github/workflows/release-please.yml`. Pushes to `master` update or create a release PR with computed version bump and notes; merging that PR creates a git tag and GitHub release. Ensure repository Actions settings allow GitHub Actions to create pull requests. Production auto-deploys from `master` are disabled in `vercel.json` (`git.deploymentEnabled.master=false`), so production deploys must be promoted or triggered manually in Vercel.

## Contributing

Contributions are welcome through issues and pull requests. Keep changes focused, include relevant tests, and run the validation workflow before opening a PR.

SEO routing and canonical conventions are documented in `docs/SEO_CANONICAL_STRATEGY.md`.

### Valtio Subscription Guidance

For contributor guidance on choosing `useSnapshot` vs `useValtioSync` under React Compiler, see `docs/VALTIO_REACT_COMPILER_GUIDANCE.md`.

## License

MIT License. See [`LICENSE`](LICENSE).
