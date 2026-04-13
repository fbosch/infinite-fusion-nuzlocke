## 1. Duplicate-state derivation

- [ ] 1.1 Add a focused helper or selector that scans canonical playthrough encounters and returns captured-species ids for combobox duplicate checks.
- [ ] 1.2 Cover captured-provenance fallback behavior so stored or deceased Pokemon that were previously captured still count as duplicates.

## 2. Combobox rendering

- [ ] 2.1 Thread duplicate-state lookup from `PokemonCombobox.tsx` into option rendering without changing current search and route ordering.
- [ ] 2.2 Update `PokemonOptions.tsx` to render a compact duplicate indicator that coexists with source tags, dex number, and existing keyboard/selection states.

## 3. Verification

- [ ] 3.1 Add targeted tests for duplicate-marked and non-duplicate option rows.
- [ ] 3.2 Run focused validation for the touched files: format, lint, and targeted test coverage.
