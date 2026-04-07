import { track } from "@vercel/analytics";
import { z } from "zod";
import { type PokemonOptionType, PokemonStatus } from "@/loaders/pokemon";
import type { Playthrough } from "@/stores/playthroughs/types";

const COOKIE_PREFERENCES_KEY = "cookie-preferences";

const ConsentPreferencesSchema = z.object({
  analytics: z.boolean(),
  speedInsights: z.boolean().optional(),
});

export const CHECKPOINT_THRESHOLDS = [1, 5, 10, 20, 40, 80] as const;

export type AnalyticsCheckpoint = (typeof CHECKPOINT_THRESHOLDS)[number];

export type CheckpointLabel =
  | "cp_1"
  | "cp_5"
  | "cp_10"
  | "cp_20"
  | "cp_40"
  | "cp_80";

const CHECKPOINT_LABELS: Record<AnalyticsCheckpoint, CheckpointLabel> = {
  1: "cp_1",
  5: "cp_5",
  10: "cp_10",
  20: "cp_20",
  40: "cp_40",
  80: "cp_80",
};

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

export type AnalyticsGameMode = "classic" | "remix" | "randomized";

const toAnalyticsGameMode = (gameMode: string): AnalyticsGameMode => {
  if (gameMode === "remix") return "remix";
  if (gameMode === "randomized") return "randomized";
  return "classic";
};

export type SharedAnalyticsContext = {
  playthrough_id: string;
  game_mode: AnalyticsGameMode;
  encounter_count_bucket: EncounterCountBucket;
  deceased_count_bucket: CountBucket;
  boxed_count_bucket: CountBucket;
  fusion_count_bucket: CountBucket;
  viable_roster_bucket: ViableRosterBucket;
};

const SharedAnalyticsContextSchema = z.object({
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
});

const EventSchemaMap = {
  playthrough_created: SharedAnalyticsContextSchema.extend({
    has_existing_playthroughs: z.boolean(),
  }),
  run_checkpoint_reached: SharedAnalyticsContextSchema.extend({
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
  }),
  playthrough_resumed: SharedAnalyticsContextSchema.extend({
    days_since_last_active_bucket: z.enum([
      "d_same_day",
      "d_1_2_days",
      "d_3_6_days",
      "d_7_13_days",
      "d_14_29_days",
      "d_30_plus_days",
    ]),
  }),
  fusion_created: SharedAnalyticsContextSchema.extend({
    location_id: z.string().min(1),
    creation_method: z.enum(["create_fusion", "update_encounter", "drag_drop"]),
  }),
  fusion_flipped: SharedAnalyticsContextSchema.extend({
    location_id: z.string().min(1),
  }),
  encounter_marked_deceased: SharedAnalyticsContextSchema.extend({
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
  }),
  playthrough_exported: SharedAnalyticsContextSchema,
} as const;

export type AnalyticsEventName = keyof typeof EventSchemaMap;

export type AnalyticsEventPayloadMap = {
  [Name in AnalyticsEventName]: z.infer<(typeof EventSchemaMap)[Name]>;
};

export type AnalyticsEventPayload<Name extends AnalyticsEventName> =
  AnalyticsEventPayloadMap[Name];

export type RuntimeEnv = {
  NODE_ENV?: string;
  NEXT_PUBLIC_VERCEL_ENV?: string;
};

type MinimalStorage = Pick<Storage, "getItem">;

export type AnalyticsRuntimeOptions = {
  env?: RuntimeEnv;
  storage?: MinimalStorage | null;
};

const hasAnalyticsConsent = (storage: MinimalStorage | null): boolean => {
  if (!storage) {
    return false;
  }

  const rawPreferences = storage.getItem(COOKIE_PREFERENCES_KEY);
  if (!rawPreferences) {
    return false;
  }

  try {
    const parsed = JSON.parse(rawPreferences) as unknown;
    const result = ConsentPreferencesSchema.safeParse(parsed);
    return result.success && result.data.analytics;
  } catch {
    return false;
  }
};

const getRuntimeStorage = (
  storage?: MinimalStorage | null,
): MinimalStorage | null => {
  if (storage !== undefined) {
    return storage;
  }

  if (typeof window === "undefined") {
    return null;
  }

  return globalThis.localStorage ?? null;
};

export const canTrackCustomEvents = (
  options: AnalyticsRuntimeOptions = {},
): boolean => {
  const env = options.env ?? process.env;
  const isProductionRuntime =
    env.NODE_ENV === "production" &&
    env.NEXT_PUBLIC_VERCEL_ENV === "production";

  if (!isProductionRuntime) {
    return false;
  }

  return hasAnalyticsConsent(getRuntimeStorage(options.storage));
};

const warnEventValidationFailure = (
  eventName: AnalyticsEventName,
  issues: z.core.$ZodIssue[],
): void => {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  console.warn("Invalid analytics payload", {
    eventName,
    issues: issues.map((issue) => ({
      path: issue.path,
      message: issue.message,
    })),
  });
};

export const trackCustomEvent = <Name extends AnalyticsEventName>(
  eventName: Name,
  payload: AnalyticsEventPayload<Name>,
  options: AnalyticsRuntimeOptions = {},
): boolean => {
  const schema = EventSchemaMap[eventName];
  const parsedPayload = schema.safeParse(payload);

  if (!parsedPayload.success) {
    warnEventValidationFailure(eventName, parsedPayload.error.issues);
    return false;
  }

  if (!canTrackCustomEvents(options)) {
    return false;
  }

  try {
    track(eventName, parsedPayload.data);
    return true;
  } catch {
    return false;
  }
};

const toEncounterCountBucket = (count: number): EncounterCountBucket => {
  if (count <= 0) return "e_0";
  if (count === 1) return "e_1";
  if (count <= 4) return "e_2_4";
  if (count <= 9) return "e_5_9";
  if (count <= 19) return "e_10_19";
  if (count <= 39) return "e_20_39";
  if (count <= 79) return "e_40_79";
  return "e_80_plus";
};

const toCountBucket = (count: number): CountBucket => {
  if (count <= 0) return "c_0";
  if (count === 1) return "c_1";
  if (count <= 3) return "c_2_3";
  if (count <= 7) return "c_4_7";
  if (count <= 15) return "c_8_15";
  return "c_16_plus";
};

const toViableRosterBucket = (count: number): ViableRosterBucket => {
  if (count <= 0) return "v_0";
  if (count === 1) return "v_1";
  if (count <= 3) return "v_2_3";
  if (count <= 5) return "v_4_5";
  return "v_6_plus";
};

const getEncounterPokemon = (playthrough: Playthrough): PokemonOptionType[] => {
  const encounters = playthrough.encounters ?? {};
  const pokemonById = new Map<string, PokemonOptionType>();
  let syntheticId = 0;

  for (const encounter of Object.values(encounters)) {
    if (encounter.head) {
      const key = encounter.head.uid ?? `head-${syntheticId++}`;
      pokemonById.set(key, encounter.head);
    }

    if (encounter.body) {
      const key = encounter.body.uid ?? `body-${syntheticId++}`;
      pokemonById.set(key, encounter.body);
    }
  }

  return [...pokemonById.values()];
};

const countFilledEncounters = (playthrough: Playthrough): number => {
  const encounters = playthrough.encounters ?? {};
  let count = 0;

  for (const encounter of Object.values(encounters)) {
    if (encounter.head || encounter.body) {
      count += 1;
    }
  }

  return count;
};

const countCompleteFusions = (playthrough: Playthrough): number => {
  const encounters = playthrough.encounters ?? {};
  let count = 0;

  for (const encounter of Object.values(encounters)) {
    if (encounter.isFusion && encounter.head && encounter.body) {
      count += 1;
    }
  }

  return count;
};

const countByStatus = (
  pokemon: PokemonOptionType[],
  status: (typeof PokemonStatus)[keyof typeof PokemonStatus],
): number => {
  let count = 0;

  for (const mon of pokemon) {
    if (mon.status === status) {
      count += 1;
    }
  }

  return count;
};

const countViableRoster = (pokemon: PokemonOptionType[]): number => {
  let count = 0;

  for (const mon of pokemon) {
    if (
      mon.status === PokemonStatus.CAPTURED ||
      mon.status === PokemonStatus.RECEIVED ||
      mon.status === PokemonStatus.TRADED
    ) {
      count += 1;
    }
  }

  return count;
};

export const buildSharedAnalyticsContext = (
  playthrough: Playthrough,
): SharedAnalyticsContext => {
  const encounterPokemon = getEncounterPokemon(playthrough);
  const filledEncounters = countFilledEncounters(playthrough);
  const completeFusionCount = countCompleteFusions(playthrough);
  const deceasedCount = countByStatus(encounterPokemon, PokemonStatus.DECEASED);
  const boxedCount = countByStatus(encounterPokemon, PokemonStatus.STORED);
  const viableRosterCount = countViableRoster(encounterPokemon);

  return {
    playthrough_id: playthrough.id,
    game_mode: toAnalyticsGameMode(playthrough.gameMode),
    encounter_count_bucket: toEncounterCountBucket(filledEncounters),
    deceased_count_bucket: toCountBucket(deceasedCount),
    boxed_count_bucket: toCountBucket(boxedCount),
    fusion_count_bucket: toCountBucket(completeFusionCount),
    viable_roster_bucket: toViableRosterBucket(viableRosterCount),
  };
};

export const getCheckpointLabel = (
  checkpoint: AnalyticsCheckpoint,
): CheckpointLabel => {
  return CHECKPOINT_LABELS[checkpoint];
};

export const getDormancyBucket = (
  lastActiveTimestampMs: number,
  nowTimestampMs = Date.now(),
): DormancyBucket => {
  const dayInMs = 24 * 60 * 60 * 1000;
  const elapsedMs = Math.max(0, nowTimestampMs - lastActiveTimestampMs);
  const days = Math.floor(elapsedMs / dayInMs);

  if (days === 0) return "d_same_day";
  if (days <= 2) return "d_1_2_days";
  if (days <= 6) return "d_3_6_days";
  if (days <= 13) return "d_7_13_days";
  if (days <= 29) return "d_14_29_days";
  return "d_30_plus_days";
};
