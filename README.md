# <img src="https://github.com/fbosch/infinite-fusion-nuzlocke/blob/master/src/app/favicon-32x32.png?raw=true" height="27px" width="26px" /> Infinite Fusion Nuzlocke Tracker

Track Pokemon Infinite Fusion Nuzlocke runs with encounter logging, team and box management.

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-149eca)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-blue)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

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

- Node.js `22.x`
- Corepack-enabled pnpm `10.x`

```bash
corepack enable
corepack prepare pnpm@10 --activate
pnpm install
pnpm dev
```

Open [http://localhost:4000](http://localhost:4000).

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

pnpm data:refresh
pnpm spritesheet
```

## Validation Workflow

For behavior or run-state changes, run checks in this order:

```bash
pnpm type-check
pnpm test:run
pnpm validate
```

## Contributing

Contributions are welcome via issues and pull requests.

## License

MIT License. See [`LICENSE`](LICENSE).
