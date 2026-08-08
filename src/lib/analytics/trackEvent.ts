import { track } from "@vercel/analytics";

type AnalyticsPrimitive = string | number | boolean;

type AnalyticsProperties = Record<string, AnalyticsPrimitive>;

export const ANALYTICS_EVENTS = {
  createPlaythroughModalOpened: "create_playthrough_modal_opened",
  encounterMarkedDeceased: "encounter_marked_deceased",
  firstEncounterSaved: "first_encounter_saved",
  fusionCreated: "fusion_created",
  fusionFlipped: "fusion_flipped",
  gameModeChanged: "game_mode_changed",
  githubCtaViewed: "github_cta_viewed",
  landingViewed: "landing_viewed",
  playthroughCreated: "playthrough_created",
  playthroughExported: "playthrough_exported",
  playthroughImported: "playthrough_imported",
  playthroughImportFailed: "playthrough_import_failed",
  playthroughResumed: "playthrough_resumed",
  playthroughSelectorOpened: "playthrough_selector_opened",
  playthroughSwitched: "playthrough_switched",
  runCheckpointReached: "run_checkpoint_reached",
} as const;

export type AnalyticsEventName =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

export type EncounterCountBucket =
  | "e_0"
  | "e_1"
  | "e_2_4"
  | "e_5_9"
  | "e_10_19"
  | "e_20_39"
  | "e_40_79"
  | "e_80_plus";

export type CountBucket =
  | "c_0"
  | "c_1"
  | "c_2_3"
  | "c_4_7"
  | "c_8_15"
  | "c_16_plus";

export type ViableRosterBucket = "v_0" | "v_1" | "v_2_3" | "v_4_5" | "v_6_plus";

export type DormancyBucket =
  | "d_same_day"
  | "d_1_2_days"
  | "d_3_6_days"
  | "d_7_13_days"
  | "d_14_29_days"
  | "d_30_plus_days";

type GameMode = "classic" | "remix" | "randomized";
export type SourceSurface =
  | "header"
  | "playthrough_selector"
  | "create_playthrough_modal"
  | "game_mode_toggle"
  | "store";
export type TriggerMethod = "click" | "keyboard" | "submit" | "programmatic";

export type SharedEventProperties = {
  playthrough_id: string;
  game_mode: GameMode;
  encounter_count_bucket: EncounterCountBucket;
  deceased_count_bucket: CountBucket;
  boxed_count_bucket: CountBucket;
  fusion_count_bucket: CountBucket;
  viable_roster_bucket: ViableRosterBucket;
};

export type Checkpoint = 1 | 5 | 10 | 20 | 40 | 80;
export type CheckpointLabel =
  | "cp_1"
  | "cp_5"
  | "cp_10"
  | "cp_20"
  | "cp_40"
  | "cp_80";

export type ImportSource = "file_picker";
export type FileExtensionGroup = "json" | "other";
export type MimeGroup = "application_json" | "text_plain" | "empty" | "other";
export type ImportFailureStage =
  | "file_selection"
  | "file_read"
  | "json_parse"
  | "schema_validation"
  | "store_import"
  | "unknown";
export type ImportErrorCategory =
  | "unsupported_file_type"
  | "invalid_json"
  | "invalid_schema"
  | "duplicate_id"
  | "storage_failure"
  | "unexpected";

export type AnalyticsEventMap = {
  landing_viewed: SharedEventProperties & {
    entry_route: "home" | "locations" | "other";
  };
  playthrough_selector_opened: SharedEventProperties & {
    source_surface: "header";
  };
  create_playthrough_modal_opened: SharedEventProperties & {
    source_surface: "header";
  };
  first_encounter_saved: SharedEventProperties & {
    location_id: string;
  };
  playthrough_created: SharedEventProperties & {
    has_existing_playthroughs: boolean;
  };
  playthrough_switched: SharedEventProperties & {
    previous_playthrough_id: string;
    new_playthrough_id: string;
    source_surface: SourceSurface;
    trigger_method: TriggerMethod;
  };
  playthrough_imported: SharedEventProperties & {
    import_source: ImportSource;
    file_extension_group: FileExtensionGroup;
    mime_group: MimeGroup;
  };
  playthrough_import_failed: SharedEventProperties & {
    import_source: ImportSource;
    failure_stage: ImportFailureStage;
    error_category: ImportErrorCategory;
    has_file: boolean;
    file_extension_group: FileExtensionGroup;
    mime_group: MimeGroup;
  };
  run_checkpoint_reached: SharedEventProperties & {
    checkpoint: Checkpoint;
    checkpoint_label: CheckpointLabel;
  };
  playthrough_resumed: SharedEventProperties & {
    days_since_last_active_bucket: DormancyBucket;
  };
  game_mode_changed: SharedEventProperties & {
    previous_game_mode: GameMode;
    new_game_mode: GameMode;
    source_surface: SourceSurface;
    trigger_method: TriggerMethod;
  };
  fusion_created: SharedEventProperties & {
    location_id: string;
    creation_method: "create_fusion" | "update_encounter" | "drag_drop";
  };
  fusion_flipped: SharedEventProperties & {
    location_id: string;
  };
  encounter_marked_deceased: SharedEventProperties & {
    location_id: string;
    was_fused: boolean;
    team_size_after: 0 | 1 | 2 | 3 | 4 | 5 | 6;
    viable_roster_bucket_after: ViableRosterBucket;
  };
  playthrough_exported: SharedEventProperties;
  github_cta_viewed: {
    source_surface: "fixed_top_bar";
    route: "home" | "locations";
  };
};

type BlockReason =
  | "non_browser"
  | "non_production"
  | "no_consent"
  | "kill_switch"
  | "invalid_payload"
  | "track_error";

type EventCounter = {
  sent: number;
  blocked: number;
};

export type AnalyticsDebugCounters = {
  sent: number;
  blocked: number;
  byEvent: Record<AnalyticsEventName, EventCounter>;
  blockReasons: Record<BlockReason, number>;
};

const COOKIE_PREFERENCES_KEY = "cookie-preferences";
const DISABLE_ANALYTICS_VALUES = new Set(["1", "true", "yes", "on"]);

type AppEnvironment = {
  NODE_ENV?: string;
  NEXT_PUBLIC_VERCEL_ENV?: string;
  NEXT_PUBLIC_DISABLE_CUSTOM_ANALYTICS?: string;
  DISABLE_CUSTOM_ANALYTICS?: string;
  NEXT_PUBLIC_ANALYTICS_DEBUG?: string;
  ANALYTICS_DEBUG?: string;
};

const ANALYTICS_PRODUCTION_HOSTNAMES = new Set([
  "fusion.nuzlocke.io",
  "www.fusion.nuzlocke.io",
]);

const createByEventCounter = (): Record<AnalyticsEventName, EventCounter> => ({
  create_playthrough_modal_opened: { blocked: 0, sent: 0 },
  encounter_marked_deceased: { blocked: 0, sent: 0 },
  first_encounter_saved: { blocked: 0, sent: 0 },
  fusion_created: { blocked: 0, sent: 0 },
  fusion_flipped: { blocked: 0, sent: 0 },
  game_mode_changed: { blocked: 0, sent: 0 },
  github_cta_viewed: { blocked: 0, sent: 0 },
  landing_viewed: { blocked: 0, sent: 0 },
  playthrough_created: { blocked: 0, sent: 0 },
  playthrough_exported: { blocked: 0, sent: 0 },
  playthrough_import_failed: { blocked: 0, sent: 0 },
  playthrough_imported: { blocked: 0, sent: 0 },
  playthrough_resumed: { blocked: 0, sent: 0 },
  playthrough_selector_opened: { blocked: 0, sent: 0 },
  playthrough_switched: { blocked: 0, sent: 0 },
  run_checkpoint_reached: { blocked: 0, sent: 0 },
});

const createBlockReasonCounter = (): Record<BlockReason, number> => ({
  invalid_payload: 0,
  kill_switch: 0,
  no_consent: 0,
  non_browser: 0,
  non_production: 0,
  track_error: 0,
});

const analyticsDebugCounters: AnalyticsDebugCounters = {
  blocked: 0,
  blockReasons: createBlockReasonCounter(),
  byEvent: createByEventCounter(),
  sent: 0,
};

export function resetAnalyticsDebugCounters(): void {
  analyticsDebugCounters.sent = 0;
  analyticsDebugCounters.blocked = 0;
  analyticsDebugCounters.byEvent = createByEventCounter();
  analyticsDebugCounters.blockReasons = createBlockReasonCounter();
}

export function getAnalyticsDebugCounters(): AnalyticsDebugCounters {
  const byEvent = Object.fromEntries(
    Object.entries(analyticsDebugCounters.byEvent).map(
      ([eventName, counts]) => [
        eventName,
        {
          blocked: counts.blocked,
          sent: counts.sent,
        },
      ],
    ),
  ) as Record<AnalyticsEventName, EventCounter>;

  return {
    blocked: analyticsDebugCounters.blocked,
    blockReasons: {
      ...analyticsDebugCounters.blockReasons,
    },
    byEvent,
    sent: analyticsDebugCounters.sent,
  };
}

function isAnalyticsDebugEnabled(
  environment: AppEnvironment = process.env,
): boolean {
  const value =
    environment.NEXT_PUBLIC_ANALYTICS_DEBUG ?? environment.ANALYTICS_DEBUG;
  if (value == null) {
    return false;
  }

  return DISABLE_ANALYTICS_VALUES.has(value.trim().toLowerCase());
}

function isCustomEventKillSwitchEnabled(
  environment: AppEnvironment = process.env,
): boolean {
  const value =
    environment.NEXT_PUBLIC_DISABLE_CUSTOM_ANALYTICS ??
    environment.DISABLE_CUSTOM_ANALYTICS;
  if (value == null) {
    return false;
  }

  return DISABLE_ANALYTICS_VALUES.has(value.trim().toLowerCase());
}

function recordSent(eventName: AnalyticsEventName): void {
  analyticsDebugCounters.sent += 1;
  analyticsDebugCounters.byEvent[eventName].sent += 1;
}

function recordBlocked(
  eventName: AnalyticsEventName,
  reason: BlockReason,
): void {
  analyticsDebugCounters.blocked += 1;
  analyticsDebugCounters.byEvent[eventName].blocked += 1;
  analyticsDebugCounters.blockReasons[reason] += 1;
}

function debugLog(
  message: string,
  metadata: Record<string, unknown>,
  environment: AppEnvironment = process.env,
): void {
  if (!isAnalyticsDebugEnabled(environment)) {
    return;
  }

  console.debug(message, metadata);
}

// fallow-ignore-next-line complexity -- This is the single exhaustive boundary validator for analytics event payloads.
function isValidEventPayload<EventName extends AnalyticsEventName>(
  eventName: EventName,
  properties: AnalyticsEventMap[EventName],
): properties is AnalyticsEventMap[EventName] {
  const sharedKeys = [
    "playthrough_id",
    "game_mode",
    "encounter_count_bucket",
    "deceased_count_bucket",
    "boxed_count_bucket",
    "fusion_count_bucket",
    "viable_roster_bucket",
  ];
  const eventKeys: Record<AnalyticsEventName, string[]> = {
    create_playthrough_modal_opened: ["source_surface"],
    encounter_marked_deceased: [
      "location_id",
      "was_fused",
      "team_size_after",
      "viable_roster_bucket_after",
    ],
    first_encounter_saved: ["location_id"],
    fusion_created: ["location_id", "creation_method"],
    fusion_flipped: ["location_id"],
    game_mode_changed: [
      "previous_game_mode",
      "new_game_mode",
      "source_surface",
      "trigger_method",
    ],
    github_cta_viewed: ["source_surface", "route"],
    landing_viewed: ["entry_route"],
    playthrough_created: ["has_existing_playthroughs"],
    playthrough_exported: [],
    playthrough_import_failed: [
      "import_source",
      "failure_stage",
      "error_category",
      "has_file",
      "file_extension_group",
      "mime_group",
    ],
    playthrough_imported: [
      "import_source",
      "file_extension_group",
      "mime_group",
    ],
    playthrough_resumed: ["days_since_last_active_bucket"],
    playthrough_selector_opened: ["source_surface"],
    playthrough_switched: [
      "previous_playthrough_id",
      "new_playthrough_id",
      "source_surface",
      "trigger_method",
    ],
    run_checkpoint_reached: ["checkpoint", "checkpoint_label"],
  };
  const candidate = properties as Record<string, unknown>;
  const allowedKeys =
    eventName === "github_cta_viewed"
      ? eventKeys[eventName]
      : [...sharedKeys, ...eventKeys[eventName]];
  const hasOnlyAllowedKeys = Object.keys(candidate).every((key) =>
    allowedKeys.includes(key),
  );
  const isNonEmptyString = (value: unknown) =>
    typeof value === "string" && value.length > 0;
  const isOneOf = (
    value: unknown,
    values: readonly string[] | readonly number[],
  ) => values.includes(value as never);
  const valid =
    hasOnlyAllowedKeys &&
    (eventName === "github_cta_viewed" ||
      (isNonEmptyString(candidate.playthrough_id) &&
        isOneOf(candidate.game_mode, ["classic", "remix", "randomized"]) &&
        isOneOf(candidate.encounter_count_bucket, [
          "e_0",
          "e_1",
          "e_2_4",
          "e_5_9",
          "e_10_19",
          "e_20_39",
          "e_40_79",
          "e_80_plus",
        ]) &&
        isOneOf(candidate.deceased_count_bucket, [
          "c_0",
          "c_1",
          "c_2_3",
          "c_4_7",
          "c_8_15",
          "c_16_plus",
        ]) &&
        isOneOf(candidate.boxed_count_bucket, [
          "c_0",
          "c_1",
          "c_2_3",
          "c_4_7",
          "c_8_15",
          "c_16_plus",
        ]) &&
        isOneOf(candidate.fusion_count_bucket, [
          "c_0",
          "c_1",
          "c_2_3",
          "c_4_7",
          "c_8_15",
          "c_16_plus",
        ]) &&
        isOneOf(candidate.viable_roster_bucket, [
          "v_0",
          "v_1",
          "v_2_3",
          "v_4_5",
          "v_6_plus",
        ])));
  if (valid === false) {
    debugLog("Analytics payload blocked by schema", {
      eventName,
      issues: [{ message: "Invalid event payload", path: [] }],
    });
    return false;
  }

  if (eventName === "github_cta_viewed") {
    return (
      candidate.source_surface === "fixed_top_bar" &&
      isOneOf(candidate.route, ["home", "locations"])
    );
  }

  if (
    (eventName === "landing_viewed" &&
      !isOneOf(candidate.entry_route, ["home", "locations", "other"])) ||
    ((eventName === "playthrough_selector_opened" ||
      eventName === "create_playthrough_modal_opened") &&
      candidate.source_surface !== "header") ||
    ((eventName === "first_encounter_saved" ||
      eventName === "fusion_flipped") &&
      !isNonEmptyString(candidate.location_id)) ||
    (eventName === "playthrough_created" &&
      typeof candidate.has_existing_playthroughs !== "boolean") ||
    (eventName === "run_checkpoint_reached" &&
      (!isOneOf(candidate.checkpoint, [1, 5, 10, 20, 40, 80]) ||
        candidate.checkpoint_label !== `cp_${candidate.checkpoint}`)) ||
    (eventName === "encounter_marked_deceased" &&
      (!isNonEmptyString(candidate.location_id) ||
        typeof candidate.was_fused !== "boolean" ||
        !isOneOf(candidate.team_size_after, [0, 1, 2, 3, 4, 5, 6]) ||
        !isOneOf(candidate.viable_roster_bucket_after, [
          "v_0",
          "v_1",
          "v_2_3",
          "v_4_5",
          "v_6_plus",
        ])))
  ) {
    debugLog("Analytics payload blocked by schema", {
      eventName,
      issues: [{ message: "Invalid event payload", path: [] }],
    });
    return false;
  }

  if (
    eventName === "playthrough_switched" ||
    eventName === "game_mode_changed"
  ) {
    if (
      !(
        isOneOf(candidate.source_surface, [
          "header",
          "playthrough_selector",
          "create_playthrough_modal",
          "game_mode_toggle",
          "store",
        ]) &&
        isOneOf(candidate.trigger_method, [
          "click",
          "keyboard",
          "submit",
          "programmatic",
        ])
      )
    ) {
      return false;
    }

    if (
      eventName === "playthrough_switched" &&
      !(
        isNonEmptyString(candidate.previous_playthrough_id) &&
        isNonEmptyString(candidate.new_playthrough_id)
      )
    ) {
      return false;
    }

    if (
      eventName === "game_mode_changed" &&
      !(
        isOneOf(candidate.previous_game_mode, [
          "classic",
          "remix",
          "randomized",
        ]) &&
        isOneOf(candidate.new_game_mode, ["classic", "remix", "randomized"])
      )
    ) {
      return false;
    }
  }

  if (
    eventName === "fusion_created" &&
    !(
      isNonEmptyString(candidate.location_id) &&
      isOneOf(candidate.creation_method, [
        "create_fusion",
        "update_encounter",
        "drag_drop",
      ])
    )
  ) {
    return false;
  }
  if (
    eventName === "playthrough_resumed" &&
    !isOneOf(candidate.days_since_last_active_bucket, [
      "d_same_day",
      "d_1_2_days",
      "d_3_6_days",
      "d_7_13_days",
      "d_14_29_days",
      "d_30_plus_days",
    ])
  ) {
    return false;
  }
  if (
    (eventName === "playthrough_imported" ||
      eventName === "playthrough_import_failed") &&
    (candidate.import_source !== "file_picker" ||
      !isOneOf(candidate.file_extension_group, ["json", "other"]) ||
      !isOneOf(candidate.mime_group, [
        "application_json",
        "text_plain",
        "empty",
        "other",
      ]))
  ) {
    return false;
  }
  if (
    eventName === "playthrough_import_failed" &&
    (typeof candidate.has_file !== "boolean" ||
      !isOneOf(candidate.failure_stage, [
        "file_selection",
        "file_read",
        "json_parse",
        "schema_validation",
        "store_import",
        "unknown",
      ]) ||
      !isOneOf(candidate.error_category, [
        "unsupported_file_type",
        "invalid_json",
        "invalid_schema",
        "duplicate_id",
        "storage_failure",
        "unexpected",
      ]))
  ) {
    return false;
  }

  return true;
}

export function isAnalyticsProductionEnvironment(
  environment: AppEnvironment = process.env,
  browserHostname?: string,
): boolean {
  if (environment.NEXT_PUBLIC_VERCEL_ENV === "production") {
    return true;
  }

  if (
    environment.NEXT_PUBLIC_VERCEL_ENV === "preview" ||
    environment.NEXT_PUBLIC_VERCEL_ENV === "development"
  ) {
    return false;
  }

  const hostname =
    browserHostname ??
    (typeof window === "undefined" ? undefined : globalThis.location?.hostname);

  if (hostname == null) {
    return false;
  }

  return ANALYTICS_PRODUCTION_HOSTNAMES.has(hostname.toLowerCase());
}

function getBrowserStorage(): Pick<Storage, "getItem"> | null {
  if (typeof globalThis === "undefined") {
    return null;
  }

  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
}

export function hasAnalyticsConsent(
  storage: Pick<Storage, "getItem"> | null | undefined = getBrowserStorage(),
): boolean {
  if (storage == null) {
    return false;
  }

  let value: string | null;
  try {
    value = storage.getItem(COOKIE_PREFERENCES_KEY);
  } catch {
    return false;
  }

  if (value == null) {
    return false;
  }

  try {
    const parsed: unknown = JSON.parse(value);
    return (
      typeof parsed === "object" &&
      parsed !== null &&
      (parsed as { analytics?: unknown }).analytics === true
    );
  } catch {
    return false;
  }
}

export function trackEvent<EventName extends AnalyticsEventName>(
  eventName: EventName,
  properties: AnalyticsEventMap[EventName],
): boolean {
  if (typeof window === "undefined") {
    recordBlocked(eventName, "non_browser");
    return false;
  }

  if (!isValidEventPayload(eventName, properties)) {
    recordBlocked(eventName, "invalid_payload");
    return false;
  }

  if (isCustomEventKillSwitchEnabled()) {
    recordBlocked(eventName, "kill_switch");
    debugLog("Analytics event blocked by kill switch", { eventName });
    return false;
  }

  if (!isAnalyticsProductionEnvironment()) {
    recordBlocked(eventName, "non_production");
    return false;
  }

  if (!hasAnalyticsConsent()) {
    recordBlocked(eventName, "no_consent");
    return false;
  }

  try {
    track(eventName, properties satisfies AnalyticsProperties);
    recordSent(eventName);
    return true;
  } catch {
    recordBlocked(eventName, "track_error");
    debugLog("Analytics event failed to send", { eventName });
    return false;
  }
}
