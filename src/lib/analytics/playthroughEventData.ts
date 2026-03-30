import type { Checkpoint } from "./trackEvent";

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

export {
  getCheckpointLabel,
  toCountBucket,
  toDormancyBucket,
  toEncounterCountBucket,
  toViableRosterBucket,
} from "./buckets";
export {
  getBoxedCount,
  getDeceasedCount,
  getEncounterCount,
  getFusionCount,
  getSharedEventProperties,
  getTeamSizeAfter,
  getViableRosterSize,
} from "./selectors";
