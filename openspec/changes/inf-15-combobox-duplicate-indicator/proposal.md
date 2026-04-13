## Why

The Pokemon combobox currently shows route and search matches without signaling when a species has already been captured elsewhere in the run. That forces duplicate-rule checks into memory and makes accidental duplicate selections more likely during normal encounter entry.

## What Changes

- Add duplicate-state signaling to combobox options when the displayed species already exists in the current playthrough as a captured Pokemon.
- Define the duplicate signal source from canonical run-state data instead of ad-hoc component-local tracking.
- Preserve existing combobox search, selection, loading, and keyboard behavior while layering the indicator into option rendering.

## Capabilities

### New Capabilities
- `combobox-duplicate-indicators`: Defines when Pokemon combobox options must surface a duplicate indicator based on current playthrough capture state.

### Modified Capabilities
- None.

## Impact

- Affected code will likely include `src/components/PokemonCombobox/PokemonCombobox.tsx`, `src/components/PokemonCombobox/PokemonOptions.tsx`, and a small shared selector/helper for reading duplicate state from `useEncounters()`.
- Validation should stay focused on combobox rendering behavior and duplicate-state derivation from canonical encounter data.
- No API, persistence schema, or migration work is expected.
