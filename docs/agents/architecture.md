# Architecture

## Target tree

`src/app` contains Next.js routes, shell components, and app-specific infrastructure. Product code belongs to `src/features/{pokemon,playthroughs,encounters,roster,preferences}`. Reusable, domain-independent code belongs to `src/shared`. `src/types` is reserved for ambient declarations; assets remain in `src/assets`.

## Ownership and dependencies

Own a module where its product policy lives. If it has no feature policy and has at least two independent consumers, it belongs in `shared`; otherwise keep it with its feature. Dependencies flow upward: `shared ← pokemon ← playthroughs ← encounters ← roster`. `preferences` may depend on `playthroughs` for legacy-run settings defaults, as an approved exception. `app` may compose every feature and `shared`.

Within a feature, use relative imports. Across features, import only from the target feature's explicit public entrypoint. Use `index.ts` for client-safe APIs, `server.ts` for server-only APIs, and a narrowly scoped client-neutral entrypoint such as `pokemon/model.ts` when model code must not evaluate client UI. Routes are thin app adapters over server entrypoints.
