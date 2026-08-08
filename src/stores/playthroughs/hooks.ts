import React from "react";
import { useSnapshot } from "valtio";
import type { CustomLocation } from "@/loaders/locations";
import {
  getAvailableAfterLocations,
  getMergedLocations,
} from "./customLocations";
import { getAllPlaythroughs, playthroughsStore } from "./store";
import {
  type EncounterData,
  type GameMode,
  isGameMode,
  type Playthrough,
} from "./types";

// Reusable hooks for components
export const usePlaythroughsSnapshot = () => useSnapshot(playthroughsStore);

export const useAllPlaythroughs = () => {
  const snapshot = useSnapshot(playthroughsStore);

  // Automatically load all playthroughs if we only have one loaded (likely just the active one)
  // and we're not currently loading
  React.useEffect(() => {
    if (
      !playthroughsStore.isLoading &&
      playthroughsStore.playthroughs.length <= 1
    ) {
      getAllPlaythroughs().catch((error) => {
        console.error("Failed to load all playthroughs:", error);
      });
    }
  }, [snapshot.isLoading, snapshot.playthroughs.length]);

  return snapshot.playthroughs;
};

export const useActivePlaythrough = (): Playthrough | null => {
  const snapshot = useSnapshot(playthroughsStore);

  if (!snapshot.activePlaythroughId) {
    return null;
  }

  const activePlaythroughData = snapshot.playthroughs.find(
    (p) => p.id === snapshot.activePlaythroughId,
  );

  return activePlaythroughData ? (activePlaythroughData as Playthrough) : null;
};

export const useActivePlaythroughId = (): string | null => {
  const snapshot = useSnapshot(playthroughsStore);
  return snapshot.activePlaythroughId ?? null;
};

export const useIsRemixMode = (): boolean => {
  const snapshot = useSnapshot(playthroughsStore);
  const activePlaythrough = snapshot.playthroughs.find(
    (p) => p.id === snapshot.activePlaythroughId,
  );
  return activePlaythrough?.gameMode === "remix";
};

export const useGameMode = (): GameMode => {
  const snapshot = useSnapshot(playthroughsStore);
  const activePlaythrough = snapshot.playthroughs.find(
    (p) => p.id === snapshot.activePlaythroughId,
  );

  return isGameMode(activePlaythrough?.gameMode)
    ? activePlaythrough.gameMode
    : "classic";
};

export const useIsRandomizedMode = (): boolean => {
  const snapshot = useSnapshot(playthroughsStore);
  const activePlaythrough = snapshot.playthroughs.find(
    (p) => p.id === snapshot.activePlaythroughId,
  );
  return activePlaythrough?.gameMode === "randomized";
};

export const usePlaythroughById = (
  playthroughId: string | undefined,
): Playthrough | null => {
  const snapshot = useSnapshot(playthroughsStore);
  const playthroughData = snapshot.playthroughs.find(
    (p) => p.id === playthroughId,
  );

  if (!(playthroughId && playthroughData)) {
    return null;
  }
  return playthroughData as Playthrough;
};

export const useIsLoading = (): boolean => {
  const snapshot = useSnapshot(playthroughsStore);
  return snapshot.isLoading;
};

export const useEncounters = (): Playthrough["encounters"] => {
  const snapshot = useSnapshot(playthroughsStore);
  const activePlaythrough = snapshot.playthroughs.find(
    (p) => p.id === snapshot.activePlaythroughId,
  );

  // Valtio snapshots are already reactive, no need for additional memoization
  return activePlaythrough?.encounters || {};
};

// Hook for subscribing to a specific encounter - only rerenders when that encounter changes
export const useEncounter = (locationId: string): EncounterData | null => {
  const snapshot = useSnapshot(playthroughsStore);
  const activePlaythrough = snapshot.playthroughs.find(
    (p) => p.id === snapshot.activePlaythroughId,
  );

  // Valtio snapshots are already reactive to deep changes
  return activePlaythrough?.encounters?.[locationId] || null;
};

const useIsSaving = (): boolean => {
  const snapshot = useSnapshot(playthroughsStore);
  return snapshot.isSaving;
};

// Custom location hooks
export const useCustomLocations = (): CustomLocation[] => {
  const activePlaythrough = useActivePlaythrough();

  return activePlaythrough?.customLocations || [];
};

const useMergedLocations = () => {
  useActivePlaythrough();

  return getMergedLocations();
};

const useAvailableAfterLocations = () => {
  useActivePlaythrough();

  return getAvailableAfterLocations();
};
