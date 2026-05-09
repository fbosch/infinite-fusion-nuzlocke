# Analytics Event Contract (v2)

This document is the source of truth for analytics taxonomy, trigger points, payload properties, buckets, and dedupe rules.

## Contract rules

- Event names are stable, snake_case, and versioned by this document.
- Event-specific properties use snake_case names.
- Properties are flat key-value pairs only (no nested objects, no arrays).
- Property value types are limited to `string`, `number`, and `boolean`.
- Lifecycle transition properties use paired `previous_*` and `new_*` names for the transitioned dimension.
- Source attribution uses bounded `source_surface` and `trigger_method` values.
- All count or time dimensions use the bucket labels in this document.

## Canonical events

| Event | Trigger point | Emits when | Does not emit when |
| --- | --- | --- | --- |
| `landing_viewed` | Client runtime observer mounted from `src/app/layout.tsx` | Active playthrough is available after store load, once per playthrough per tab session | Store is still loading, no active playthrough, or same session already emitted |
| `playthrough_selector_opened` | `PlaythroughSelector` header control | User opens the playthrough selector popover | Store is still loading or no active playthrough is available |
| `create_playthrough_modal_opened` | Create action inside `PlaythroughSelector` | User opens the create playthrough modal | No active playthrough is available |
| `first_encounter_saved` | Encounter mutation paths in `src/stores/playthroughs/encounters/crud.ts` and `src/stores/playthroughs/encounters/fusion.ts` | Encounter count changes from zero to at least one | Encounter count was already non-zero or mutation removes data |
| `playthrough_created` | `createPlaythrough` in `src/stores/playthroughs/store.ts` | A new playthrough is successfully appended to store state | Creation short-circuits or throws before append |
| `playthrough_switched` | `setActivePlaythrough` in `src/stores/playthroughs/store.ts` | Active playthrough changes from one existing id to a different loaded/importable id | Requested playthrough cannot be found/loaded, no previous active playthrough exists, or requested id is already active |
| `game_mode_changed` | Game mode mutation helpers in `src/stores/playthroughs/store.ts` | Active playthrough mode changes to a different mode | No active playthrough exists or requested mode matches current mode |
| `playthrough_imported` | Import success path in `src/hooks/usePlaythroughImportExport.ts` | Import file parse, store import, and active playthrough lookup complete successfully | Import fails before active imported playthrough state is available |
| `playthrough_import_failed` | Import failure paths in `src/hooks/usePlaythroughImportExport.ts` | Import attempt fails at file selection, file read, JSON parse, schema validation, store import, or unknown stage | Import completes successfully |
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
| `game_mode` | `"classic" \| "remix" \| "randomized"` | Active mode at emit time |
| `encounter_count_bucket` | `EncounterCountBucket` | Bucketed encounter count at emit time |
| `deceased_count_bucket` | `CountBucket` | Bucketed deceased count at emit time |
| `boxed_count_bucket` | `CountBucket` | Bucketed stored/boxed count at emit time |
| `fusion_count_bucket` | `CountBucket` | Bucketed complete fusion count at emit time |
| `viable_roster_bucket` | `ViableRosterBucket` | Bucketed viable roster size at emit time |

## Event-specific properties

### `landing_viewed`

| Property | Type | Notes |
| --- | --- | --- |
| `entry_route` | `"home" \| "locations" \| "other"` | Low-cardinality route bucket at emit time |

### `playthrough_selector_opened`

| Property | Type | Notes |
| --- | --- | --- |
| `source_surface` | `"header"` | UI surface that opened the selector |

### `create_playthrough_modal_opened`

| Property | Type | Notes |
| --- | --- | --- |
| `source_surface` | `"header"` | UI surface that opened the modal |

### `first_encounter_saved`

| Property | Type | Notes |
| --- | --- | --- |
| `location_id` | `string` | Encounter location identifier |

### `playthrough_created`

| Property | Type | Notes |
| --- | --- | --- |
| `has_existing_playthroughs` | `boolean` | True when at least one playthrough existed before create |

### `playthrough_switched`

| Property | Type | Notes |
| --- | --- | --- |
| `previous_playthrough_id` | `string` | Active playthrough id before the switch |
| `new_playthrough_id` | `string` | Active playthrough id after the switch |
| `source_surface` | `SourceSurface` | Surface or domain owner that initiated the switch |
| `trigger_method` | `TriggerMethod` | User or programmatic trigger bucket |

### `game_mode_changed`

| Property | Type | Notes |
| --- | --- | --- |
| `previous_game_mode` | `"classic" \| "remix" \| "randomized"` | Mode before the transition |
| `new_game_mode` | `"classic" \| "remix" \| "randomized"` | Mode after the transition |
| `source_surface` | `SourceSurface` | Surface or domain owner that initiated the change |
| `trigger_method` | `TriggerMethod` | User or programmatic trigger bucket |

### `playthrough_imported`

| Property | Type | Notes |
| --- | --- | --- |
| `import_source` | `"file_picker"` | Import entrypoint bucket |
| `file_extension_group` | `"json" \| "other"` | Low-cardinality file extension group |
| `mime_group` | `"application_json" \| "text_plain" \| "empty" \| "other"` | Low-cardinality MIME group |

### `playthrough_import_failed`

| Property | Type | Notes |
| --- | --- | --- |
| `import_source` | `"file_picker"` | Import entrypoint bucket |
| `failure_stage` | `ImportFailureStage` | Normalized stage where the attempt failed |
| `error_category` | `ImportErrorCategory` | Normalized error taxonomy value; raw error text is prohibited |
| `has_file` | `boolean` | True when a file object was available |
| `file_extension_group` | `"json" \| "other"` | Low-cardinality file extension group |
| `mime_group` | `"application_json" \| "text_plain" \| "empty" \| "other"` | Low-cardinality MIME group |

### `run_checkpoint_reached`

| Property | Type | Notes |
| --- | --- | --- |
| `checkpoint` | `1 \| 5 \| 10 \| 20 \| 40 \| 80` | Threshold crossed by this mutation |
| `checkpoint_label` | `"cp_1" \| "cp_5" \| "cp_10" \| "cp_20" \| "cp_40" \| "cp_80"` | Stable string form for dashboard filters |

### `playthrough_resumed`

| Property | Type | Notes |
| --- | --- | --- |
| `days_since_last_active_bucket` | `DormancyBucket` | Derived from `updatedAt` or equivalent last-active timestamp |

### `fusion_created`

| Property | Type | Notes |
| --- | --- | --- |
| `location_id` | `string` | Encounter location identifier |
| `creation_method` | `"create_fusion" \| "update_encounter" \| "drag_drop"` | Path used to create complete fusion |

### `fusion_flipped`

| Property | Type | Notes |
| --- | --- | --- |
| `location_id` | `string` | Encounter location identifier |

### `encounter_marked_deceased`

| Property | Type | Notes |
| --- | --- | --- |
| `location_id` | `string` | Encounter location identifier |
| `was_fused` | `boolean` | Encounter was fusion at the moment of death transition |
| `team_size_after` | `0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6` | Team size after mutation |
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

### `ImportFailureStage`

- `file_selection`
- `file_read`
- `json_parse`
- `schema_validation`
- `store_import`
- `unknown`

### `ImportErrorCategory`

- `unsupported_file_type`
- `invalid_json`
- `invalid_schema`
- `duplicate_id`
- `storage_failure`
- `unexpected`

### `SourceSurface`

- `header`
- `playthrough_selector`
- `create_playthrough_modal`
- `game_mode_toggle`
- `store`

### `TriggerMethod`

- `click`
- `keyboard`
- `submit`
- `programmatic`

## Dedupe policy

| Event | Dedupe strategy |
| --- | --- |
| `landing_viewed` | Session dedupe per playthrough using session storage (once per tab session) |
| `playthrough_selector_opened` | No storage dedupe required; emit each successful open intent |
| `create_playthrough_modal_opened` | No storage dedupe required; emit each successful modal open intent |
| `first_encounter_saved` | Transition dedupe only; emit when encounter count crosses from zero to one or more |
| `playthrough_created` | No storage dedupe required; emit once per successful `createPlaythrough` call |
| `playthrough_switched` | Transition dedupe only; emit once per successful active-id transition |
| `game_mode_changed` | Transition dedupe only; emit once per successful mode transition |
| `playthrough_imported` | No storage dedupe required; emit once per successful import completion |
| `playthrough_import_failed` | No storage dedupe required; emit once per failed import attempt |
| `run_checkpoint_reached` | Monotonic threshold dedupe per playthrough using persistent local storage keyed by playthrough id |
| `playthrough_resumed` | Session dedupe per playthrough using session storage (once per tab session) |
| `fusion_created` | Transition dedupe only; emit on state transition into complete fusion, never on steady state |
| `fusion_flipped` | No dedupe required beyond successful operation gating |
| `encounter_marked_deceased` | Transition dedupe only; emit only when status changes into deceased state |
| `playthrough_exported` | No storage dedupe required; emit once per successful export action |

## Implementation notes

- Trigger detection belongs at action/mutation boundaries for mutation-backed events (for example `first_encounter_saved`), while pure UI-intent events such as `playthrough_selector_opened` and `create_playthrough_modal_opened` may emit from their presentational component.
- Event payload builders should read canonical store state after mutation when the event requires after-state fields.
- Any contract change in event names, property names, bucket labels, or thresholds must update this document first.
