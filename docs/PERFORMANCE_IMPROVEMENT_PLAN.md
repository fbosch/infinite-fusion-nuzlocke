# Performance Improvement Plan

## Purpose

Address browser-profiled work before changing unmeasured code paths. The first slice targets the location table because it produces confirmed initial-render reflow and layout shift. Sprite delivery and populated-run state work remain separate slices.

## Measured Baseline

Measurements ran in Helium against the local application without CPU or network throttling.

| Scenario | Result | Evidence |
| --- | --- | --- |
| Production cold load | LCP 1,008 ms; 990 ms render delay; 18 ms TTFB | Production trace |
| Production cold load | CLS 0.10; largest cluster 0.0965 | Production trace |
| Production cold load | 133 ms forced reflow | Production trace |
| First combobox open | INP 667 ms; 588 ms processing | Development trace |
| Warm combobox search | INP 32 ms | Development trace |
| First combobox sprite delivery | 140.6 kB estimated image savings | Chrome image-delivery insight |
| Production PC drawer open | INP 183 ms; 134 ms processing; 72 ms forced reflow | Production trace |

The production load is network-light. Render work, layout stability, and first-interaction work are the priority.

## Scope And Order

1. Remove location-table post-render measurement. Completed.
2. Eliminate the hydrated playthrough-menu layout shift. Completed.
3. Optimize Gen 7 and Gen 8 spritesheet delivery on the first combobox interaction.
4. Reprofile combobox search before changing search or cache behavior.
5. Profile a populated playthrough before optimizing location-cell or PC-sheet derivations.

Each numbered section is an independently reviewable change. Do not combine them without fresh measurements showing that the combined work is needed.

## 1. Stabilize The Location Table

### Problem

`src/components/LocationTable/useLocationTableVirtualization.ts` reads table and header geometry in `useLayoutEffect`. The initial browser trace identifies this path as the main forced-layout source. The loading skeleton and loaded table also use different container and table constraints, which makes the skeleton-to-table swap the leading CLS suspect.

### Changes

- Remove the runtime header-cell measurement while preserving the browser's existing automatic table layout.
- Remove `useContainerLayoutSnapshot`, `measuredTableLayout`, the layout effect, and DOM geometry reads from `useLocationTableVirtualization.ts` once no longer needed.
- Avoid changing `LocationTableSkeleton.tsx` unless a separate visual regression is reproduced.
- Keep virtualization, overscan, scroll-to-location, and row-height behavior unchanged.

### Tests

- Extend an existing scroll test only if the refactor affects virtual scrolling or scroll-to-location behavior.
- Do not use jsdom timing assertions. Browser traces are the performance acceptance evidence.

### Acceptance Criteria

- Initial production trace contains no forced reflow attributable to table/header geometry measurement.
- Column widths, mobile overflow, sticky headers, skeleton appearance, and virtual scrolling retain their existing behavior.

### Measurement Outcome

The table measurement path was removed from the forced-reflow trace. CLS remained at 0.0964 because it originates outside the table: after persisted state hydrates, `PlaythroughMenu` adds `GameModeToggle`, moving the selector and main content by 44 px. This requires a separate hydration-layout slice.

## 2. Eliminate The Hydrated Playthrough-Menu Layout Shift

### Problem

The server initially renders `PlaythroughSelector` without an active playthrough. After client persistence hydrates, `src/components/playthrough/PlaythroughMenu.tsx` adds `GameModeToggle`, changing the menu from a 44 px selector to a stacked control and moving the main content. A browser `PerformanceObserver` attributes 0.0882 CLS to this transition.

### Changes

- Establish a stable pre-hydration height for the playthrough-menu area.
- Keep the server and first client render structurally compatible with persisted active-playthrough state.
- Avoid changing game-mode behavior, selector behavior, or canonical playthrough state.

### Acceptance Criteria

- The 44 px selector/main-content movement is absent from layout-shift entries.
- The production cold-load CLS cluster falls materially below 0.0964.
- Game-mode selection remains unavailable until an active playthrough exists.

### Measurement Outcome

`PlaythroughMenu` now renders `GameModeToggle` before and after hydration. With no active playthrough, its existing disabled state preserves the menu height and prevents selection. The cleared-storage layout-shift probe removed the previous 0.0882 shift; its remaining shifts total 0.0037 and originate from the GitHub CTA. The comparable production trace reports CLS 0.00.

## 3. Optimize Cold Combobox Sprite Delivery

### Problem

The first combobox open produced 667 ms INP. After required data is warm, search INP is 32 ms. Chrome estimates that `public/images/pokemon-gen7-spritesheet.png` has 140.6 kB of potential image-delivery savings. `PokemonSprite` also marks every rendered Gen 7 sprite eager and high priority.

### Changes

- Use the existing Sharp spritesheet generator to create lossless WebP candidates for the Gen 7 and Gen 8 sheets.
- Compare byte size and pixel output against the current PNGs. Adopt WebP only when visual fidelity and metadata coordinates remain unchanged.
- Update `scripts/generate-spritesheet.ts` and `src/components/PokemonSprite.tsx` together if the format changes.
- Restrict high-priority/eager loading to sprites visible in the opened combobox viewport. Preserve immediate rendering for visible sprites.
- Keep generated files deterministic and regenerate only the assets required by the approved format change.

### Tests

- Add or extend generator tests to assert the expected Gen 7 and Gen 8 generated filenames and metadata contracts.
- Exercise Gen 7 and Gen 8 sprite rendering and option-list behavior through existing Pokemon combobox tests.
- Verify both sheets retain sprite dimensions, offsets, pixelated rendering, and missing-sprite behavior.

### Acceptance Criteria

- Each spritesheet transfer falls materially below its current PNG baseline.
- Cold combobox INP improves without delaying visible option sprites.
- Warm search remains at or below the measured 32 ms interaction baseline.

## 4. Reprofile Search Before Algorithm Changes

### Current Evidence

`PokemonCombobox.tsx` uses an order-preserving but quadratic duplicate filter. `usePokemonSearch` disables in-memory query retention. Both are code-level opportunities, but warm search is currently fast. Neither should be changed solely because the implementation is suboptimal.

### Decision Gate

- Profile broad text and numeric queries with representative result counts after sprite work lands.
- Count worker searches while typing, backspacing, and repeating a term.
- Measure main-thread time for option construction and total interaction latency.

### Conditional Changes

- If deduplication is measurable, replace `findIndex` filtering with an order-preserving `Set<number>` pass and add ordering/deduplication tests.
- If repeated queries rerun the worker materially, retain search results for a bounded in-memory lifetime. Keep `persister: undefined` so arbitrary search terms are not persisted.

### Acceptance Criteria

- Preserve route-result priority, search relevance ordering, egg filtering, and duplicate semantics.
- Demonstrate an interaction or scripting-time improvement in a browser trace before treating this work as complete.

## 5. Profile Populated Playthroughs Before State-Derivation Changes

### Current Evidence

`LocationCell` rescans encounters per visible row, and the PC sheet derives roster data while closed. These are confirmed redundant computations but have not been measured with a representative populated run.

The production PC drawer currently opens in 183 ms. Conditionally mounting the complete drawer could move module and data work onto the click path and make the interaction worse.

### Measurement Fixture

- Use a deterministic 512-encounter playthrough fixture.
- Profile one visible encounter update, PC drawer open, and an encounter update while the drawer is closed.
- Capture React render counts, scripting time, INP, and PC-open latency.

### Conditional Changes

- Introduce an origin-location index only if visible location-cell scans materially affect update cost. Preserve the existing head/body tooltip semantics.
- Defer only PC-sheet data-dependent content if closed-drawer work is material. Keep the drawer module prefetched unless traces show that it is also on a critical path.

### Acceptance Criteria

- Preserve location tooltip contents, team/box/graveyard classification, tab behavior, and PC opening interaction quality.
- Demonstrate an improvement with the populated fixture before merging either optimization.

## Verification Protocol

Run every before/after browser comparison with the same viewport, browser profile state, CPU setting, network setting, and trace workflow.

1. Start production locally with `pnpm build` and `pnpm start -- --port 4001`.
2. Capture cold `/` load, cold combobox open/search, warm search, and PC drawer open traces.
3. Record LCP, CLS, INP, forced-reflow time, transfer bytes, and visual behavior.
4. Run the smallest relevant tests for each slice.
5. Run `pnpm type-check`.
6. Run `pnpm test:run`.
7. Run `pnpm validate`.
8. Re-run the production traces and record before/after values in the change or pull request description.

Check desktop and mobile layouts, dark mode, reduced motion, rapid table scrolling, and first/warm combobox operation before declaring a slice complete.
