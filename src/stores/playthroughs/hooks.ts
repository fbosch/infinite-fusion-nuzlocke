import React, { useMemo } from 'react';
import { useSnapshot } from 'valtio';
import { z } from 'zod';
import { CustomLocationSchema } from '@/loaders/locations';
import { GameMode, Playthrough, EncounterData } from './types';
import { playthroughsStore } from './store';
import { getAllPlaythroughs } from './store';
import {
  getMergedLocations,
  getAvailableAfterLocations,
} from './customLocations';

// Reusable hooks for components
export const usePlaythroughsSnapshot = () => {
  return useSnapshot(playthroughsStore);
};

export const useAllPlaythroughs = () => {
  const snapshot = useSnapshot(playthroughsStore);

  // Automatically load all playthroughs if we only have one loaded (likely just the active one)
  // and we're not currently loading
  React.useEffect(() => {
    if (!snapshot.isLoading && snapshot.playthroughs.length <= 1) {
      getAllPlaythroughs().catch(error => {
        console.error('Failed to load all playthroughs:', error);
      });
    }
  }, [snapshot.isLoading, snapshot.playthroughs.length]);

  return useMemo(() => {
    return snapshot.playthroughs;
  }, [snapshot.playthroughs]);
};

export const useActivePlaythrough = (): Playthrough | null => {
  const snapshot = useSnapshot(playthroughsStore);

  return useMemo(() => {
    if (!snapshot.activePlaythroughId) return null;

    const activePlaythroughData = snapshot.playthroughs.find(
      p => p.id === snapshot.activePlaythroughId
    );

    return (activePlaythroughData as Playthrough) || null;
  }, [snapshot.activePlaythroughId, snapshot.playthroughs]);
};

export const useIsRemixMode = (): boolean => {
  const snapshot = useSnapshot(playthroughsStore);
  const activePlaythrough = snapshot.playthroughs.find(
    p => p.id === snapshot.activePlaythroughId
  );
  return activePlaythrough?.gameMode === 'remix';
};

export const useGameMode = (): GameMode => {
  const snapshot = useSnapshot(playthroughsStore);
  const activePlaythrough = snapshot.playthroughs.find(
    p => p.id === snapshot.activePlaythroughId
  );
  return (activePlaythrough?.gameMode as GameMode) || 'classic';
};

export const useIsRandomizedMode = (): boolean => {
  const snapshot = useSnapshot(playthroughsStore);
  const activePlaythrough = snapshot.playthroughs.find(
    p => p.id === snapshot.activePlaythroughId
  );
  return activePlaythrough?.gameMode === 'randomized';
};

export const usePlaythroughById = (
  playthroughId: string | undefined
): Playthrough | null => {
  const snapshot = useSnapshot(playthroughsStore);
  const playthroughData = snapshot.playthroughs.find(
    p => p.id === playthroughId
  );

  return useMemo(() => {
    if (!playthroughId || !playthroughData) return null;
    // Valtio snapshots are already immutable, no need to clone
    return playthroughData as Playthrough;
  }, [playthroughId, playthroughData]);
};

export const useIsLoading = (): boolean => {
  const snapshot = useSnapshot(playthroughsStore);
  return snapshot.isLoading;
};

export const useEncounters = (): Playthrough['encounters'] => {
  const snapshot = useSnapshot(playthroughsStore);
  const activePlaythrough = snapshot.playthroughs.find(
    p => p.id === snapshot.activePlaythroughId
  );

  // Valtio snapshots are already reactive, no need for additional memoization
  return activePlaythrough?.encounters || {};
};

// Hook for subscribing to a specific encounter - only rerenders when that encounter changes
export const useEncounter = (locationId: string): EncounterData | null => {
  const snapshot = useSnapshot(playthroughsStore);
  const activePlaythrough = snapshot.playthroughs.find(
    p => p.id === snapshot.activePlaythroughId
  );

  // Valtio snapshots are already reactive to deep changes
  return activePlaythrough?.encounters?.[locationId] || null;
};

export const useIsSaving = (): boolean => {
  const snapshot = useSnapshot(playthroughsStore);
  return snapshot.isSaving;
};

// Custom location hooks
export const useCustomLocations = (): z.infer<
  typeof CustomLocationSchema
>[] => {
  const activePlaythrough = useActivePlaythrough();

  return useMemo(() => {
    return activePlaythrough?.customLocations || [];
  }, [activePlaythrough?.customLocations]);
};

export const useMergedLocations = () => {
  const activePlaythrough = useActivePlaythrough();

  return useMemo(() => {
    return getMergedLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePlaythrough?.customLocations]);
};

export const useAvailableAfterLocations = () => {
  const activePlaythrough = useActivePlaythrough();

  return useMemo(() => {
    return getAvailableAfterLocations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePlaythrough?.customLocations]);
};

// Hook for preferred variants - simplified version
export const usePreferredVariant = (
  headId?: number | null,
  bodyId?: number | null
) => {
  const setPreferredVariant = React.useCallback(
    async (variant?: string) => {
      const { setPreferredVariant: setGlobalVariant } = await import(
        '@/lib/preferredVariants'
      );
      await setGlobalVariant(headId, bodyId, variant);
    },
    [headId, bodyId]
  );

  return {
    setPreferredVariant,
  };
};
