# INF-138 Impeccable Trial Design Audit

## Scope

Trial run for the project-local Impeccable workflow on the current Pokemon Infinite Fusion Nuzlocke tracker UI.

Screens and flows covered:

- Home / locations table at desktop width (`1440x1000`).
- Home / locations table at mobile width (`390x844`).
- Header controls: settings, PC, game mode, and playthrough selector entry points.
- Modal and sheet surfaces through deterministic detector hits: settings, PC, custom locations, artwork variants, playthrough creation, cookie settings, credits, and team picker.

Evidence generated during the run:

- `pnpm design:detect:json`
- `/tmp/opencode/inf-138-home-desktop.png`
- `/tmp/opencode/inf-138-home-mobile.png`
- Agent-browser accessibility snapshot for `http://127.0.0.1:4000`

Chrome-backed browser interaction was unavailable in this environment because the installed browser binary was missing `libglib-2.0.so.0`. Firefox headless screenshots covered rendered home views; modal and sheet evidence came from Impeccable detector output and component locations.

## Impeccable Detector Summary

Command:

```bash
pnpm design:detect:json
```

Result: exited `2` because detector findings were present.

Finding groups:

- Pure black overlays in modal and sheet components.
- Gray text on colored backgrounds in status, destructive, and action controls.
- Gradient text in the header brand lockup.
- Border-accent styling on a rounded modal section.

Representative files:

- `src/components/Header/index.tsx`
- `src/components/LocationTable/FusionToggleButton.tsx`
- `src/components/LocationTable/ResetEncounterButton.tsx`
- `src/components/LocationTable/customLocations/RemoveLocationButton.tsx`
- `src/components/PokemonCombobox/PokemonEvolutionButton.tsx`
- `src/components/PokemonSummaryCard/ArtworkVariantModal.tsx`
- `src/components/team/TeamMemberSelectionPanel.tsx`
- `src/components/team/TeamMemberPickerModal.tsx`
- `src/components/pc/PokemonPCSheet.tsx`
- `src/components/Header/SettingsModal.tsx`

## Prioritized Backlog

### P1: Mobile Header Clips Primary Controls

Observed evidence: `inf-138-home-mobile.png` at `390x844` shows the game mode segmented control and playthrough selector cut off on the right edge. The header places brand/actions, team slots, game mode, and playthrough selection in a desktop-oriented layout that does not reflow cleanly.

Impact: mobile users can lose access to primary run controls or need to infer horizontal overflow. This is likely to cause wrong mode/playthrough context before editing encounters.

Next action: redesign the mobile header as stacked task bands. Keep brand and icon actions on the first row, move game mode and playthrough selector to full-width rows, and hide or collapse empty team-slot placeholders until a playthrough exists.

### P2: First-Run State Looks Like Indefinite Loading

Observed evidence: both desktop and mobile screenshots show a large skeleton table with no visible playthrough-specific guidance. The only actionable control is the playthrough selector in the header, which is partially clipped on mobile.

Impact: a new or empty user sees the core table as unavailable rather than being guided to create/import/select a run.

Next action: add a first-run panel above or inside the table area when no active playthrough exists. Include one primary action for creating/selecting/importing a playthrough, a short explanation of what will appear, and keep the table skeleton only for actual data loading.

### P2: Colored Controls Use Low-Semantic Gray Foregrounds

Observed evidence: Impeccable flagged gray text on colored backgrounds in `FusionToggleButton`, `ResetEncounterButton`, `RemoveLocationButton`, `PokemonEvolutionButton`, `TeamMemberActions`, and `TeamMemberSelectionPanel`.

Impact: status and destructive actions can read as disabled or low-priority even when they are important run-state controls. This also weakens contrast on red, green, blue, and orange surfaces.

Next action: create semantic foreground rules for colored action surfaces: near-white text/icons on saturated fills, hue-matched dark text on pale fills, and disabled styles that do not reuse active color backgrounds.

### P3: Header Branding Uses Generic Gradient Text

Observed evidence: Impeccable flagged `bg-clip-text + bg-gradient` in `src/components/Header/index.tsx`. The desktop screenshot shows the brand lockup competing with the sparse header controls rather than anchoring the product state.

Impact: gradient title treatment reads decorative without adding Pokemon-specific meaning. It is also one of Impeccable's common AI-slop signals.

Next action: replace gradient text with a solid, domain-specific title treatment. Use the existing Pokeball mark, sprite/pixel typography contrast, and one accent color tied to run state instead of multi-stop text gradients.

### P3: Modal Overlays Repeat Pure Black Backdrops

Observed evidence: Impeccable flagged `bg-black` overlays in confirmation, credits, settings, custom location, artwork variant, location selector, cookie settings, PC sheet, create playthrough, and team picker components.

Impact: the modal layer is visually harsher than the rest of the soft gray/tinted UI and may produce inconsistent perceived depth across sheets and dialogs.

Next action: centralize overlay treatment with a tinted backdrop token, for example slate/blue-black with opacity and blur tuned once. Apply it through shared modal/sheet wrappers instead of repeated `bg-black` classes.

### P3: Empty Team Slots Dominate Header Before They Have Value

Observed evidence: the desktop screenshot shows six large empty team-slot placeholders centered in the header while no active playthrough is selected.

Impact: empty placeholders consume the most prominent header space before the user can act on them. They also push the playthrough selector to the edge on smaller widths.

Next action: collapse team slots behind a compact empty-team affordance until a playthrough exists, or replace the six placeholders with a single "No active team" state tied to the playthrough selector.

## Follow-Up Ticket Shape

Create one grouped design follow-up ticket with this checklist:

- [ ] Fix mobile header reflow for game mode and playthrough controls.
- [ ] Replace first-run skeleton-only state with a clear create/select/import entry point.
- [ ] Audit colored action foreground tokens and update flagged controls.
- [ ] Replace header gradient text with solid domain-specific branding.
- [ ] Centralize modal/sheet overlay styling and remove repeated pure black backdrops.
- [ ] Reduce empty team-slot prominence when no active playthrough exists.

## Notes For Next Trial

- Run URL scanning after approving Puppeteer's install/build path or providing a Chrome binary with Linux shared libraries.
- Keep `pnpm design:detect:json` as the cheap gate; it is useful for catching repeated visual anti-patterns but does not replace rendered review.
