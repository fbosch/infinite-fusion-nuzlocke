## Context

`PokemonCombobox` builds its option list from route encounter data plus global search results, while `PokemonOptions` owns the visible option row. The requested duplicate signal is a shared UI concern, but its truth source must come from canonical playthrough encounter state rather than ad-hoc local flags so the combobox stays aligned with run data across team, box, and historical encounter views.

## Goals / Non-Goals

**Goals:**
- Surface duplicate state for a species directly in combobox option rows.
- Derive duplicate state from current playthrough encounters in a way that survives later status transitions like stored or deceased.
- Preserve existing combobox search ordering, source tags, selection flow, and keyboard behavior.

**Non-Goals:**
- No changes to duplicate-clause enforcement logic or selection blocking.
- No redesign of combobox layout beyond the added indicator treatment.
- No persistence or schema changes.

## Decisions

- **Use species id as the duplicate key:** Duplicate state will be keyed by `pokemon.id`, matching how combobox options are already deduplicated and rendered. Alternative considered: keying by nickname or UID, rejected because duplicate-clause semantics are species-based.
- **Derive from canonical encounter snapshots:** Build a `Set<number>` of duplicate species from `useEncounters()` data rather than route data or search results. Alternative considered: infer from `routeEncounterData`, rejected because it only describes possible encounters for one location, not current run history.
- **Treat capture provenance as sticky:** A Pokemon counts as already captured when its encounter record shows captured provenance, preferring `originalReceivalStatus` when present and falling back to current `status` for older/unmigrated data. Alternative considered: check only current `status === captured`, rejected because boxed or deceased Pokemon would lose duplicate visibility after later status changes.
- **Keep the indicator additive-only:** The option row will add a compact icon/label treatment without changing option enabled state, ordering, or selection behavior. Alternative considered: disabling duplicates, rejected because the issue asks for indication, not enforcement.

## Risks / Trade-offs

- **Ambiguity between captured vs received/traded provenance** -> Mitigation: scope the duplicate signal to captured provenance only and document that explicitly in the spec.
- **Visual crowding in option rows** -> Mitigation: use a compact right-side treatment that coexists with source tags and dex number without changing row height.
- **False negatives on legacy data without `originalReceivalStatus`** -> Mitigation: fall back to current `status` when provenance is absent.
- **Future mismatch with stricter duplicate-clause rules** -> Mitigation: isolate duplicate derivation so later policy changes can update one helper/selector path.

## Migration Plan

1. Add a small selector/helper that scans canonical encounters for captured species ids.
2. Thread duplicate-state lookups into `PokemonCombobox` and `PokemonOptions`.
3. Add focused rendering tests for duplicate and non-duplicate rows.
4. Validate formatting, linting, and targeted tests before implementation review.

## Open Questions

- Should future duplicate signaling also cover `received` or `traded` provenance, or remain strictly limited to captured encounters?
