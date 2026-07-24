# <img src="https://github.com/fbosch/infinite-fusion-nuzlocke/blob/master/src/app/favicon-32x32.png?raw=true" height="27px" width="26px" /> Infinite Fusion Nuzlocke Tracker

Track Pokemon Infinite Fusion Nuzlocke runs with encounter logging, team and box management.

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-149eca)](https://react.dev/)
[![React Doctor](https://img.shields.io/badge/React_Doctor-43%2F100-orange)](https://github.com/millionco/react-doctor)
[![TypeScript](https://img.shields.io/badge/TypeScript-7-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Coverage](docs/coverage.svg)](https://app.codecov.io/gh/fbosch/infinite-fusion-nuzlocke)
[![Fallow health](docs/fallow.svg)](https://github.com/fallow-rs/fallow)

Live app: [fusion.nuzlocke.io](https://fusion.nuzlocke.io)  
Source: [github.com/fbosch/infinite-fusion-nuzlocke](https://github.com/fbosch/infinite-fusion-nuzlocke)

> [!NOTE]
> This project started as a way to explore agentic workflows, and I still use it as a playground for this.

---

![Infinite Fusion Nuzlocke Tracker screenshot](docs/readme-tracker-screenshot.png)

## Features

- Encounter tracking by location with quick actions and sorting
- Playthrough profiles with create/switch/delete and import/export
- Classic, Remix, and Randomized game mode support
- Team, PC, and graveyard flows that preserve run-state invariants
- Fusion-aware encounter handling and custom locations

## Quick Start

Requirements:

- Node.js `24.x`
- Corepack-enabled pnpm `10.x`

```bash
corepack enable
corepack prepare pnpm@10 --activate
pnpm install --frozen-lockfile
pnpm dev
```

Open [http://localhost:4000](http://localhost:4000).

If you use devenv, `devenv shell` provides the pinned Node.js, pnpm, git, GitHub CLI, and Worktrunk tooling, then runs dependency and git hook setup on entry.

## Common Scripts

```bash
pnpm dev
pnpm build
pnpm start

pnpm type-check
pnpm lint
pnpm validate

pnpm test
pnpm test:run
pnpm test:coverage

devenv test

pnpm data:refresh
pnpm spritesheet
```

Scraper maintenance checks:

```bash
pnpm test:run tests/scrape-wild-encounters-wikitext.test.ts
pnpm scrape:encounters
pnpm exec biome format --write data --vcs-use-ignore-file=true --files-ignore-unknown=true
pnpm validate:route-articles
```

## Validation Workflow

For behavior or run-state changes, run checks in this order:

```bash
pnpm type-check
pnpm test:run
pnpm validate
pnpm quality:pre-push
```

`pnpm quality:pre-push` runs Fallow's structural quality gate and React Doctor's
changed-code runtime diagnostics. React Doctor is limited to bugs, performance,
accessibility, and security; Fallow owns dependency hygiene, dead code,
architecture, duplication, and complexity. Run `pnpm react-doctor:badge` manually
to refresh the informational README score badge.

## Contributing

Contributions are welcome via issues and pull requests.

## License

MIT License. See [`LICENSE`](LICENSE).
