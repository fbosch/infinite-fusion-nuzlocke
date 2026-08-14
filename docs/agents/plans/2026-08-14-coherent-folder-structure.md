# Coherent Folder Structure

## Goal

Move from technical-layer ownership to a hybrid feature-first structure. Keep Next.js route boundaries and cross-feature infrastructure stable while colocating each product feature's UI, data access, contracts, and internal behavior.

This is a behavior-preserving refactor. It must not change API contracts, query keys, persisted run-state schemas, storage keys, migrations, or game-rule behavior.

## Target Structure

```text
src/
├── app/
│   ├── _components/          # App shell: header, footer, logo, credits
│   ├── _infrastructure/      # Provider composition and app-specific persistence
│   ├── api/                  # Thin Next.js route adapters
│   ├── locations/
│   ├── layout.tsx
│   └── page.tsx
├── features/
│   ├── encounters/
│   │   ├── components/       # Location table, selectors, encounter summaries
│   │   ├── data/             # Locations, encounter queries, API client
│   │   ├── model/            # Encounter contracts, validation, transforms
│   │   ├── server/           # Static-data processing for API adapters
│   │   ├── index.ts          # Curated client-safe public API
│   │   └── server.ts         # Curated server-only public API
│   ├── playthroughs/
│   │   ├── components/       # Creation, selection, import/export UI
│   │   ├── model/            # Valtio state, actions, selectors, run-state types
│   │   ├── persistence/      # Import schema, migrations, persistence pipeline
│   │   └── index.ts          # Public mutations and selectors
│   ├── pokemon/
│   │   ├── components/       # Generic Pokemon and sprite presentation
│   │   ├── data/             # Catalog queries and API client
│   │   ├── model/            # Pokemon contracts, status, predicates
│   │   ├── search/           # Search core, service, worker
│   │   ├── sprites/          # Sprite metadata and variants
│   │   ├── index.ts
│   │   └── server.ts
│   ├── preferences/
│   │   ├── components/       # Settings, consent, theme, reduced motion
│   │   ├── model/            # Settings and consent state
│   │   └── index.ts
│   └── roster/
│       ├── components/       # Team and PC UI
│       ├── model/            # Presentation-only roster derivation
│       └── index.ts
├── shared/
│   ├── analytics/
│   ├── hooks/
│   ├── query/
│   ├── ui/
│   └── utils/
├── assets/
└── types/                    # Ambient declarations only
```

Keep `data/`, `public/`, `scripts/`, root `tests/`, `docs/`, and `openspec/` outside `src`. They are data, static assets, repository tooling, test infrastructure, and documentation rather than application feature modules.

## Ownership Rules

| Current area | Target owner |
| --- | --- |
| `components/LocationTable`, `PokemonCombobox`, `PokemonSummaryCard`, `progress-bar.tsx` | `features/encounters` |
| `loaders/encounters.ts`, `loaders/locations.ts`, encounters service/query/validation/types | `features/encounters/data` and `model` |
| `app/api/encounters/encounters-processor.ts` | `features/encounters/server` |
| `stores/playthroughs`, playthrough UI, import/export workflow | `features/playthroughs` |
| `components/team`, `components/pc` | `features/roster` |
| `loaders/pokemon.ts`, Pokemon service/query/validation | `features/pokemon/data` and `model` |
| Search service, search core, worker | `features/pokemon/search` |
| Sprite hooks, metadata, variants, generic sprite UI | `features/pokemon/sprites` and `components` |
| Settings, consent, theme, reduced motion | `features/preferences` |
| Header, footer, logo, credits | `app/_components` |
| Generic dialogs, error boundaries, tooltip/context menu | `shared/ui` |
| Domain-independent hooks and utilities | `shared/hooks` and `shared/utils` |
| Query client | `shared/query` |
| Encounter-aware query persistence | `app/_infrastructure` |

`PokemonSummaryCard` belongs to encounters because it represents captured encounter state and is used by both location and roster UI. Roster owns presentation and interaction state only; canonical team mutations remain in playthroughs.

## Dependency Rules

```text
shared
  ↑
pokemon
  ↑
playthroughs
  ↑
encounters
  ↑
roster

app → public APIs from all features
preferences → shared
```

- `shared` must not import from `features` or `app`.
- `pokemon` must not depend on run state.
- `playthroughs` may use Pokemon model contracts but must remain the sole owner of canonical run state.
- `encounters` may use public APIs from Pokemon and playthroughs.
- `roster` may use public APIs from encounters, Pokemon, and playthroughs.
- `app` composes routes and providers; it may import feature public APIs.
- Use relative imports within a feature. Use curated feature entrypoints for cross-feature imports.
- Split client-safe `index.ts` and server-only `server.ts` exports. Avoid wildcard barrels.

## Migration Steps

1. Establish a baseline.

   Run `pnpm type-check`, `pnpm test:run`, `pnpm validate`, `pnpm build`, and `pnpm exec fallow audit --format json --quiet --explain`. Record inherited findings before refactoring.

   Inventory dynamic imports, worker paths, route handler imports, and test mocks. Each phase must leave the repository compiling and testable.

2. Document and enforce the target boundaries.

   Add a short architecture guide with the target tree, ownership test, dependency direction, and public-entrypoint convention. Configure Fallow's existing boundary-violation rule after verifying its supported syntax. Limit temporary exceptions to unmigrated directories and remove them with each phase.

3. Migrate preferences as a tracer bullet.

   Move settings, cookie consent, theme, and reduced-motion code into `features/preferences`. This is the lower-risk vertical slice that validates naming, public APIs, test placement, and scoped guidance before moving run-state code.

4. Extract stable contracts first.

   Move Pokemon contracts, status, and predicates from `loaders/pokemon.ts` to `features/pokemon/model`. Move `GameMode`, `CustomLocation`, and persisted playthrough contracts to `features/playthroughs/model`. Move encounter types and Zod validation to `features/encounters/model`.

   Update consumers atomically. Do not leave compatibility re-exports in old technical-layer modules. This removes the existing type-only reverse edge between loader-owned and playthrough-owned contracts.

5. Establish shared infrastructure.

   Move only domain-independent hooks, UI primitives, analytics emission, query-client setup, and utilities to `shared`. A shared module needs at least two independent consumers and cannot own feature policy.

   Keep encounter-aware query-cache validation in `app/_infrastructure`; it is application composition rather than generic persistence.

6. Consolidate Pokemon.

   Split the current overloaded `loaders/pokemon.ts`: catalog transport and query definitions go to `pokemon/data`; contracts and predicates go to `pokemon/model`; search core, service, and worker go to `pokemon/search`; sprite behavior goes to `pokemon/sprites`.

   Convert `app/api/pokemon` and sprite routes into thin Next adapters over Pokemon server modules. Update the worker construction and `.fallowrc.jsonc` dynamically loaded path in the same change.

7. Move playthrough state as one protected unit.

   Move `stores/playthroughs` to `features/playthroughs` without redesigning behavior. Preserve `playthroughActions` as the only public mutation API, plus current state shape, IndexedDB keys, migration order, analytics emission, and hydration behavior.

   Move playthrough UI and import/export workflows with the feature. Move `src/stores/AGENTS.md` guidance to `features/playthroughs/AGENTS.md` so run-state invariants retain their scope.

8. Consolidate encounters.

   Move location-table UI, Pokemon selectors, encounter summary cards, progress UI, locations, encounter data access, validation, and server processing to `features/encounters`.

   Keep `app/api/encounters/route.ts` as a thin HTTP adapter. Preserve query keys, response shapes, custom-location ordering, drag-and-drop behavior, confirmation behavior, and evolution/fusion controls.

9. Consolidate roster UI.

   Move team and PC components to `features/roster`. Keep roster models presentation-only and route mutations exclusively through the playthrough public API. Use encounter public APIs rather than duplicating cards, sprite logic, or context menus.

10. Move app-shell code and remove legacy roots.

    Move shell-only components to `app/_components` and app-specific provider composition to `app/_infrastructure`. Move generic controls to `shared/ui`.

    Classify each remaining module before removing `components`, `hooks`, `lib`, `loaders`, `services`, `stores`, `utils`, `validation`, `workers`, `contexts`, and `constants`. Do not recreate technical-layer junk drawers inside features.

    Update maintained documentation and scoped `AGENTS.md` files. Historical OpenSpec artifacts may keep paths that document completed work.

11. Complete validation.

    Run:

    ```bash
    pnpm type-check
    pnpm test:run
    pnpm validate
    pnpm test:run:browser
    pnpm build
    pnpm exec fallow audit --format json --quiet --explain
    ```

    Search runtime code, tests, and configuration for imports from deleted roots. Confirm the refactor introduces no unresolved imports, circular dependencies, or boundary violations.

## Guardrails

- Do not change API URLs or response contracts.
- Do not change TanStack Query keys or cache semantics.
- Do not change persisted playthrough schemas, versions, storage keys, or migrations.
- Do not change component behavior while moving files.
- Do not add dependencies.
- Do not introduce temporary compatibility barrels solely to ease migration.
- Keep each phase independently reviewable and green.
- Rename moved files to kebab-case only where it does not create unrelated churn.

## Completion Criteria

- Product behavior is discoverable by feature rather than technical layer.
- `src/app` contains Next.js routes and composition only.
- Cross-feature imports use explicit public APIs.
- Client and server exports are separated.
- Canonical run-state mutations still flow through `playthroughActions`.
- Legacy technical-layer roots are removed.
- Repository data, scripts, static assets, and cross-cutting tests retain their current boundaries.
- Full validation and production build pass.
