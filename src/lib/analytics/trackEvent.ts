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

const COOKIE_PREFERENCES_KEY = "cookie-preferences";

const consentPreferencesSchema = z
  .object({
    analytics: z.boolean().optional(),
  })
  .passthrough();

type AppEnvironment = {
  NODE_ENV?: string;
  NEXT_PUBLIC_VERCEL_ENV?: string;
};

export function isAnalyticsProductionEnvironment(
  environment: AppEnvironment = process.env,
): boolean {
  return (
    environment.NODE_ENV === "production" &&
    environment.NEXT_PUBLIC_VERCEL_ENV === "production"
  );
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
): void {
  if (typeof window === "undefined") {
    return;
  }

  if (!isAnalyticsProductionEnvironment()) {
    return;
  }

  if (!hasAnalyticsConsent()) {
    return;
  }

  track(eventName, properties satisfies AnalyticsProperties);
}
