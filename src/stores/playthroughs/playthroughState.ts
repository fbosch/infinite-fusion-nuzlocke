import type { Playthrough, PlaythroughsState } from "./types";

let playthroughsStoreRef: PlaythroughsState | null = null;

export const setPlaythroughsStore = (store: PlaythroughsState) => {
  playthroughsStoreRef = store;
};

const getPlaythroughsStore = () => {
  return playthroughsStoreRef;
};

export const getActivePlaythrough = (): Playthrough | null => {
  const playthroughsStore = getPlaythroughsStore();
  if (!playthroughsStore?.activePlaythroughId) {
    return null;
  }

  return (
    playthroughsStore.playthroughs.find(
      (playthrough: Playthrough) =>
        playthrough.id === playthroughsStore.activePlaythroughId,
    ) ?? null
  );
};

export const getCurrentTimestamp = (): number => {
  return Date.now();
};
