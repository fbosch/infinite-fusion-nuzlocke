import { track } from "@vercel/analytics";
import { z } from "zod";

type AnalyticsPrimitive = string | number | boolean;

export type AnalyticsProperties = Record<string, AnalyticsPrimitive>;

export const ANALYTICS_EVENTS = {
  playthroughCreated: "playthrough_created",
  runCheckpointReached: "run_checkpoint_reached",
  playthroughResumed: "playthrough_resumed",
  fusionCreated: "fusion_created",
  fusionFlipped: "fusion_flipped",
  encounterMarkedDeceased: "encounter_marked_deceased",
  playthroughExported: "playthrough_exported",
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

export type AnalyticsEventMap = {
  playthrough_created: SharedEventProperties & {
    has_existing_playthroughs: boolean;
  };
  run_checkpoint_reached: SharedEventProperties & {
    checkpoint: Checkpoint;
    checkpoint_label: CheckpointLabel;
  };
  playthrough_resumed: SharedEventProperties & {
    days_since_last_active_bucket: DormancyBucket;
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

const sharedEventPropertiesSchema = z
  .object({
    playthrough_id: z.string().min(1),
    game_mode: z.enum(["classic", "remix", "randomized"]),
    encounter_count_bucket: z.enum([
      "e_0",
      "e_1",
      "e_2_4",
      "e_5_9",
      "e_10_19",
      "e_20_39",
      "e_40_79",
      "e_80_plus",
    ]),
    deceased_count_bucket: z.enum([
      "c_0",
      "c_1",
      "c_2_3",
      "c_4_7",
      "c_8_15",
      "c_16_plus",
    ]),
    boxed_count_bucket: z.enum([
      "c_0",
      "c_1",
      "c_2_3",
      "c_4_7",
      "c_8_15",
      "c_16_plus",
    ]),
    fusion_count_bucket: z.enum([
      "c_0",
      "c_1",
      "c_2_3",
      "c_4_7",
      "c_8_15",
      "c_16_plus",
    ]),
    viable_roster_bucket: z.enum(["v_0", "v_1", "v_2_3", "v_4_5", "v_6_plus"]),
  })
  .strict();

const analyticsEventSchemaMap = {
  playthrough_created: sharedEventPropertiesSchema
    .extend({
      has_existing_playthroughs: z.boolean(),
    })
    .strict(),
  run_checkpoint_reached: sharedEventPropertiesSchema
    .extend({
      checkpoint: z.union([
        z.literal(1),
        z.literal(5),
        z.literal(10),
        z.literal(20),
        z.literal(40),
        z.literal(80),
      ]),
      checkpoint_label: z.enum([
        "cp_1",
        "cp_5",
        "cp_10",
        "cp_20",
        "cp_40",
        "cp_80",
      ]),
    })
    .strict(),
  playthrough_resumed: sharedEventPropertiesSchema
    .extend({
      days_since_last_active_bucket: z.enum([
        "d_same_day",
        "d_1_2_days",
        "d_3_6_days",
        "d_7_13_days",
        "d_14_29_days",
        "d_30_plus_days",
      ]),
    })
    .strict(),
  fusion_created: sharedEventPropertiesSchema
    .extend({
      location_id: z.string().min(1),
      creation_method: z.enum([
        "create_fusion",
        "update_encounter",
        "drag_drop",
      ]),
    })
    .strict(),
  fusion_flipped: sharedEventPropertiesSchema
    .extend({
      location_id: z.string().min(1),
    })
    .strict(),
  encounter_marked_deceased: sharedEventPropertiesSchema
    .extend({
      location_id: z.string().min(1),
      was_fused: z.boolean(),
      team_size_after: z.union([
        z.literal(0),
        z.literal(1),
        z.literal(2),
        z.literal(3),
        z.literal(4),
        z.literal(5),
        z.literal(6),
      ]),
      viable_roster_bucket_after: z.enum([
        "v_0",
        "v_1",
        "v_2_3",
        "v_4_5",
        "v_6_plus",
      ]),
    })
    .strict(),
  playthrough_exported: sharedEventPropertiesSchema,
} as const satisfies Record<AnalyticsEventName, z.ZodType<unknown>>;

const consentPreferencesSchema = z
  .object({
    analytics: z.boolean().optional(),
  })
  .passthrough();

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

const createByEventCounter = (): Record<AnalyticsEventName, EventCounter> => {
  return {
    playthrough_created: { sent: 0, blocked: 0 },
    run_checkpoint_reached: { sent: 0, blocked: 0 },
    playthrough_resumed: { sent: 0, blocked: 0 },
    fusion_created: { sent: 0, blocked: 0 },
    fusion_flipped: { sent: 0, blocked: 0 },
    encounter_marked_deceased: { sent: 0, blocked: 0 },
    playthrough_exported: { sent: 0, blocked: 0 },
  };
};

const createBlockReasonCounter = (): Record<BlockReason, number> => {
  return {
    non_browser: 0,
    non_production: 0,
    no_consent: 0,
    kill_switch: 0,
    invalid_payload: 0,
    track_error: 0,
  };
};

const analyticsDebugCounters: AnalyticsDebugCounters = {
  sent: 0,
  blocked: 0,
  byEvent: createByEventCounter(),
  blockReasons: createBlockReasonCounter(),
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
          sent: counts.sent,
          blocked: counts.blocked,
        },
      ],
    ),
  ) as Record<AnalyticsEventName, EventCounter>;

  return {
    sent: analyticsDebugCounters.sent,
    blocked: analyticsDebugCounters.blocked,
    byEvent,
    blockReasons: {
      ...analyticsDebugCounters.blockReasons,
    },
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

function isValidEventPayload<EventName extends AnalyticsEventName>(
  eventName: EventName,
  properties: AnalyticsEventMap[EventName],
): properties is AnalyticsEventMap[EventName] {
  const schema = analyticsEventSchemaMap[eventName];
  const result = schema.safeParse(properties);
  if (result.success) {
    return true;
  }

  debugLog("Analytics payload blocked by schema", {
    eventName,
    issues: result.error.issues.map((issue) => ({
      path: issue.path,
      message: issue.message,
    })),
  });

  return false;
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
    const parsedConsent = consentPreferencesSchema.safeParse(parsed);

    return parsedConsent.success && parsedConsent.data.analytics === true;
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
