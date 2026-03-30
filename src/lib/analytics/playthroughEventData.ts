import { PokemonStatus } from "@/loaders/pokemon";
import type { Playthrough } from "@/stores/playthroughs";
import type {
  Checkpoint,
  CheckpointLabel,
  CountBucket,
  DormancyBucket,
  EncounterCountBucket,
  SharedEventProperties,
  ViableRosterBucket,
} from "./trackEvent";

const CHECKPOINTS: readonly Checkpoint[] = [1, 5, 10, 20, 40, 80];
const CHECKPOINT_STORAGE_KEY_PREFIX = "analytics:checkpoints:";
const RESUME_STORAGE_KEY_PREFIX = "analytics:playthrough-resumed:";

type StorageValue = Storage | null | undefined;

const isUsableStorage = (value: StorageValue): value is Storage => {
  if (value == null) {
    return false;
  }

  return (
    typeof value.getItem === "function" && typeof value.setItem === "function"
  );
};

const getEncounterEntries = (playthrough: Playthrough) => {
  if (playthrough.encounters == null) {
    return [];
  }

  return Object.values(playthrough.encounters);
};

const getEncounterPokemon = (playthrough: Playthrough) => {
  const pokemon = [];

  for (const encounter of getEncounterEntries(playthrough)) {
    if (encounter.head) {
      pokemon.push(encounter.head);
    }

    if (encounter.body) {
      pokemon.push(encounter.body);
    }
  }

  return pokemon;
};

const getPokemonByUid = (
  playthrough: Playthrough,
): Map<string, { status?: string }> => {
  const index = new Map<string, { status?: string }>();

  for (const pokemon of getEncounterPokemon(playthrough)) {
    if (pokemon.uid) {
      index.set(pokemon.uid, pokemon);
    }
  }

  return index;
};

export const getEncounterCount = (playthrough: Playthrough): number => {
  let count = 0;

  for (const encounter of getEncounterEntries(playthrough)) {
    if (encounter.head || encounter.body) {
      count += 1;
    }
  }

  return count;
};

export const getDeceasedCount = (playthrough: Playthrough): number => {
  return getEncounterPokemon(playthrough).filter(
    (pokemon) => pokemon.status === PokemonStatus.DECEASED,
  ).length;
};

export const getBoxedCount = (playthrough: Playthrough): number => {
  return getEncounterPokemon(playthrough).filter(
    (pokemon) => pokemon.status === PokemonStatus.STORED,
  ).length;
};

export const getFusionCount = (playthrough: Playthrough): number => {
  return getEncounterEntries(playthrough).filter(
    (encounter) => encounter.isFusion && encounter.head && encounter.body,
  ).length;
};

export const getViableRosterSize = (playthrough: Playthrough): number => {
  const pokemonByUid = getPokemonByUid(playthrough);

  let count = 0;
  for (const member of playthrough.team.members) {
    if (member == null) {
      continue;
    }

    const headPokemon = pokemonByUid.get(member.headPokemonUid);
    if (headPokemon == null) {
      continue;
    }

    if (
      headPokemon.status === PokemonStatus.CAPTURED ||
      headPokemon.status === PokemonStatus.RECEIVED ||
      headPokemon.status === PokemonStatus.TRADED
    ) {
      count += 1;
    }
  }

  return count;
};

export const toEncounterCountBucket = (count: number): EncounterCountBucket => {
  if (count <= 0) return "e_0";
  if (count === 1) return "e_1";
  if (count <= 4) return "e_2_4";
  if (count <= 9) return "e_5_9";
  if (count <= 19) return "e_10_19";
  if (count <= 39) return "e_20_39";
  if (count <= 79) return "e_40_79";
  return "e_80_plus";
};

export const toCountBucket = (count: number): CountBucket => {
  if (count <= 0) return "c_0";
  if (count === 1) return "c_1";
  if (count <= 3) return "c_2_3";
  if (count <= 7) return "c_4_7";
  if (count <= 15) return "c_8_15";
  return "c_16_plus";
};

export const toViableRosterBucket = (count: number): ViableRosterBucket => {
  if (count <= 0) return "v_0";
  if (count === 1) return "v_1";
  if (count <= 3) return "v_2_3";
  if (count <= 5) return "v_4_5";
  return "v_6_plus";
};

export const toDormancyBucket = (
  daysSinceLastActive: number,
): DormancyBucket => {
  if (daysSinceLastActive <= 0) return "d_same_day";
  if (daysSinceLastActive <= 2) return "d_1_2_days";
  if (daysSinceLastActive <= 6) return "d_3_6_days";
  if (daysSinceLastActive <= 13) return "d_7_13_days";
  if (daysSinceLastActive <= 29) return "d_14_29_days";
  return "d_30_plus_days";
};

export const getCheckpointLabel = (checkpoint: Checkpoint): CheckpointLabel => {
  if (checkpoint === 1) return "cp_1";
  if (checkpoint === 5) return "cp_5";
  if (checkpoint === 10) return "cp_10";
  if (checkpoint === 20) return "cp_20";
  if (checkpoint === 40) return "cp_40";
  return "cp_80";
};

export const getCheckpointStorageKey = (playthroughId: string): string => {
  return `${CHECKPOINT_STORAGE_KEY_PREFIX}${playthroughId}`;
};

export const getResumeStorageKey = (playthroughId: string): string => {
  return `${RESUME_STORAGE_KEY_PREFIX}${playthroughId}`;
};

const parseStoredCheckpoints = (value: string | null): Set<Checkpoint> => {
  if (value == null) {
    return new Set();
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return new Set();
    }

    const checkpoints = new Set<Checkpoint>();
    for (const entry of parsed) {
      if (
        entry === 1 ||
        entry === 5 ||
        entry === 10 ||
        entry === 20 ||
        entry === 40 ||
        entry === 80
      ) {
        checkpoints.add(entry);
      }
    }

    return checkpoints;
  } catch {
    return new Set();
  }
};

export const getNewlyReachedCheckpoints = (
  playthroughId: string,
  previousEncounterCount: number,
  nextEncounterCount: number,
  storage: StorageValue = globalThis.localStorage,
): Checkpoint[] => {
  if (nextEncounterCount <= previousEncounterCount) {
    return [];
  }

  const crossed = CHECKPOINTS.filter(
    (checkpoint) =>
      previousEncounterCount < checkpoint && nextEncounterCount >= checkpoint,
  );

  if (!isUsableStorage(storage)) {
    return crossed;
  }

  const key = getCheckpointStorageKey(playthroughId);
  const existing = parseStoredCheckpoints(storage.getItem(key));
  const unsent = crossed.filter((checkpoint) => !existing.has(checkpoint));

  if (unsent.length === 0) {
    return [];
  }

  for (const checkpoint of unsent) {
    existing.add(checkpoint);
  }

  storage.setItem(key, JSON.stringify(Array.from(existing.values())));
  return unsent;
};

export const shouldTrackPlaythroughResumed = (
  playthroughId: string,
  storage: StorageValue = globalThis.sessionStorage,
): boolean => {
  if (!isUsableStorage(storage)) {
    return true;
  }

  const key = getResumeStorageKey(playthroughId);
  if (storage.getItem(key) === "1") {
    return false;
  }

  storage.setItem(key, "1");
  return true;
};

export const getDaysSinceLastActive = (
  lastActiveTimestamp: number,
  nowTimestamp: number = Date.now(),
): number => {
  const elapsedMs = nowTimestamp - lastActiveTimestamp;
  if (elapsedMs <= 0) {
    return 0;
  }

  return Math.floor(elapsedMs / 86_400_000);
};

export const getSharedEventProperties = (
  playthrough: Playthrough,
): SharedEventProperties => {
  const encounterCount = getEncounterCount(playthrough);
  const deceasedCount = getDeceasedCount(playthrough);
  const boxedCount = getBoxedCount(playthrough);
  const fusionCount = getFusionCount(playthrough);
  const viableRosterSize = getViableRosterSize(playthrough);

  return {
    playthrough_id: playthrough.id,
    game_mode: playthrough.gameMode,
    encounter_count_bucket: toEncounterCountBucket(encounterCount),
    deceased_count_bucket: toCountBucket(deceasedCount),
    boxed_count_bucket: toCountBucket(boxedCount),
    fusion_count_bucket: toCountBucket(fusionCount),
    viable_roster_bucket: toViableRosterBucket(viableRosterSize),
  };
};

export const getTeamSizeAfter = (
  playthrough: Playthrough,
): 0 | 1 | 2 | 3 | 4 | 5 | 6 => {
  const size = playthrough.team.members.filter(
    (member) => member != null,
  ).length;

  if (size <= 0) return 0;
  if (size === 1) return 1;
  if (size === 2) return 2;
  if (size === 3) return 3;
  if (size === 4) return 4;
  if (size === 5) return 5;
  return 6;
};
