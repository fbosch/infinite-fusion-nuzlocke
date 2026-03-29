# Analytics Event Contract (v1)

This document is the source of truth for analytics taxonomy, trigger points, payload properties, buckets, and dedupe rules.

## Contract rules

- Event names are stable, snake_case, and versioned by this document.
- Properties are flat key-value pairs only (no nested objects, no arrays).
- Property value types are limited to `string`, `number`, and `boolean`.
- All count or time dimensions use the bucket labels in this document.

## Canonical events

| Event | Trigger point | Emits when | Does not emit when |
| --- | --- | --- | --- |
| `playthrough_created` | `createPlaythrough` in `src/stores/playthroughs/store.ts` | A new playthrough is successfully appended to store state | Creation short-circuits or throws before append |
| `run_checkpoint_reached` | Encounter mutation paths in `src/stores/playthroughs/encounters/*.ts` | Encounter count crosses any configured checkpoint threshold | Encounter count changes without crossing a new threshold |
| `playthrough_resumed` | Client runtime observer mounted from `src/app/layout.tsx` | Active playthrough is available after store load and qualifies as a resume | Store is still loading, no active playthrough, or same session already emitted |
| `fusion_created` | Fusion transition helper called from `fusion.ts`, `crud.ts`, and `dragDrop.ts` encounter paths | Encounter transitions from not-fully-fused to fully-fused (`head` and `body` both set with fusion active) | Encounter remains non-fusion, remains partial, or is already fully fused |
| `fusion_flipped` | `flipEncounterFusion` in `src/stores/playthroughs/encounters/fusion.ts` | A flip operation succeeds on an existing fusion encounter | Encounter is missing, not fusion, or mutation does not run |
| `encounter_marked_deceased` | `markEncounterAsDeceased` in `src/stores/playthroughs/encounters/status.ts` | Encounter transitions into deceased state for this location | Operation is a no-op or status was already deceased for the encounter |
| `playthrough_exported` | Export success path in `src/hooks/usePlaythroughImportExport.ts` | Export payload serialization and download setup succeed | Export flow throws before blob URL + download setup completes |

## Shared property schema

Every event includes these shared properties unless noted otherwise.

| Property | Type | Description |
| --- | --- | --- |
| `playthrough_id` | `string` | Stable playthrough identifier |
| `game_mode` | `"classic" | "remix" | "randomized"` | Active mode at emit time |
| `encounter_count_bucket` | `EncounterCountBucket` | Bucketed encounter count at emit time |
| `deceased_count_bucket` | `CountBucket` | Bucketed deceased count at emit time |
| `boxed_count_bucket` | `CountBucket` | Bucketed stored/boxed count at emit time |
| `fusion_count_bucket` | `CountBucket` | Bucketed complete fusion count at emit time |
| `viable_roster_bucket` | `ViableRosterBucket` | Bucketed viable roster size at emit time |

## Event-specific properties

### `playthrough_created`

| Property | Type | Notes |
| --- | --- | --- |
| `has_existing_playthroughs` | `boolean` | True when at least one playthrough existed before create |

### `run_checkpoint_reached`

| Property | Type | Notes |
| --- | --- | --- |
| `checkpoint` | `1 | 5 | 10 | 20 | 40 | 80` | Threshold crossed by this mutation |
| `checkpoint_label` | `"cp_1" | "cp_5" | "cp_10" | "cp_20" | "cp_40" | "cp_80"` | Stable string form for dashboard filters |

### `playthrough_resumed`

| Property | Type | Notes |
| --- | --- | --- |
| `days_since_last_active_bucket` | `DormancyBucket` | Derived from `updatedAt` or equivalent last-active timestamp |

### `fusion_created`

| Property | Type | Notes |
| --- | --- | --- |
| `location_id` | `string` | Encounter location identifier |
| `creation_method` | `"create_fusion" | "update_encounter" | "drag_drop"` | Path used to create complete fusion |

### `fusion_flipped`

| Property | Type | Notes |
| --- | --- | --- |
| `location_id` | `string` | Encounter location identifier |

### `encounter_marked_deceased`

| Property | Type | Notes |
| --- | --- | --- |
| `location_id` | `string` | Encounter location identifier |
| `was_fused` | `boolean` | Encounter was fusion at the moment of death transition |
| `team_size_after` | `0 | 1 | 2 | 3 | 4 | 5 | 6` | Team size after mutation |
| `viable_roster_bucket_after` | `ViableRosterBucket` | Viable roster bucket after mutation |

### `playthrough_exported`

No additional properties beyond the shared schema.

## Bucket definitions

### `EncounterCountBucket`

- `e_0`
- `e_1`
- `e_2_4`
- `e_5_9`
- `e_10_19`
- `e_20_39`
- `e_40_79`
- `e_80_plus`

### `CountBucket`

- `c_0`
- `c_1`
- `c_2_3`
- `c_4_7`
- `c_8_15`
- `c_16_plus`

### `ViableRosterBucket`

- `v_0`
- `v_1`
- `v_2_3`
- `v_4_5`
- `v_6_plus`

### `DormancyBucket`

- `d_same_day` (0 days)
- `d_1_2_days`
- `d_3_6_days`
- `d_7_13_days`
- `d_14_29_days`
- `d_30_plus_days`

## Dedupe policy

| Event | Dedupe strategy |
| --- | --- |
| `playthrough_created` | No storage dedupe required; emit once per successful `createPlaythrough` call |
| `run_checkpoint_reached` | Monotonic threshold dedupe per playthrough using persistent local storage keyed by playthrough id |
| `playthrough_resumed` | Session dedupe per playthrough using session storage (once per tab session) |
| `fusion_created` | Transition dedupe only; emit on state transition into complete fusion, never on steady state |
| `fusion_flipped` | No dedupe required beyond successful operation gating |
| `encounter_marked_deceased` | Transition dedupe only; emit only when status changes into deceased state |
| `playthrough_exported` | No storage dedupe required; emit once per successful export action |

## Implementation notes

- Trigger detection belongs at action/mutation boundaries, not in presentational components.
- Event payload builders should read canonical store state after mutation when the event requires after-state fields.
- Any contract change in event names, property names, bucket labels, or thresholds must update this document first.
