import { get, set, del, createStore } from 'idb-keyval';
import { debounce } from 'es-toolkit';
import { z, ZodError } from 'zod';
import type {
  PlaythroughsState,
  Playthrough,
} from '@/stores/playthroughs/types';
import { PlaythroughSchema } from '@/stores/playthroughs/types';

// Create a custom store for playthroughs data
export const playthroughsStore_idb = createStore('playthroughs', 'data');

// Storage keys
export const ACTIVE_PLAYTHROUGH_KEY = 'activePlaythroughId';

// More efficient serialization: Use structuredClone when available, fallback to JSON
export const serializeForStorage = (obj: unknown): unknown => {
  if (typeof structuredClone !== 'undefined') {
    try {
      return structuredClone(obj);
    } catch {
      // Fallback to JSON if structured clone fails
    }
  }
  return JSON.parse(JSON.stringify(obj));
};

export const loadPlaythroughById = async (
  playthroughId: string
): Promise<Playthrough | null> => {
  if (typeof window === 'undefined') return null;

  try {
    const playthroughData = await get(playthroughId, playthroughsStore_idb);
    if (playthroughData) {
      return PlaythroughSchema.parse(playthroughData);
    }
    return null;
  } catch (error) {
    console.error(`Failed to load playthrough ${playthroughId}:`, error);
    return null;
  }
};

export const loadAllPlaythroughs = async (): Promise<Playthrough[]> => {
  if (typeof window === 'undefined') return [];

  try {
    const availablePlaythroughIds = ((await get(
      'playthrough_ids',
      playthroughsStore_idb
    )) || []) as string[];

    // Load all playthroughs in parallel
    const playthroughPromises =
      availablePlaythroughIds.map(loadPlaythroughById);
    const results = await Promise.all(playthroughPromises);

    return results.filter(
      (p: Playthrough | null): p is Playthrough => p !== null
    );
  } catch (error) {
    console.error(
      'Failed to load all playthroughs:',
      error instanceof ZodError
        ? z.prettifyError(error)
        : error instanceof Error
          ? error.message
          : String(error)
    );
    return [];
  }
};

// Delete individual playthrough from IndexedDB
export const deletePlaythroughFromIndexedDB = async (
  playthroughId: string
): Promise<void> => {
  if (typeof window === 'undefined') return;

  try {
    // Get current playthrough IDs and prepare delete operations
    const playthroughIds = ((await get(
      'playthrough_ids',
      playthroughsStore_idb
    )) || []) as string[];
    const updatedIds = playthroughIds.filter(
      (id: string) => id !== playthroughId
    );

    // Run delete and update operations in parallel
    await Promise.all([
      del(playthroughId, playthroughsStore_idb),
      set('playthrough_ids', updatedIds, playthroughsStore_idb),
    ]);
  } catch (error) {
    console.error(
      `Failed to delete playthrough ${playthroughId} from IndexedDB:`,
      error
    );
  }
};

// Immediate save function for critical operations
export const saveToIndexedDB = async (
  state: PlaythroughsState
): Promise<void> => {
  if (typeof window === 'undefined') return;

  try {
    // Save active playthrough ID
    if (state.activePlaythroughId) {
      await set(
        ACTIVE_PLAYTHROUGH_KEY,
        state.activePlaythroughId,
        playthroughsStore_idb
      );
    } else {
      await del(ACTIVE_PLAYTHROUGH_KEY, playthroughsStore_idb);
    }
  } catch (error) {
    console.error('Failed to save playthroughs to IndexedDB:', error);
  }
};

// Factory function to create debounced save function
export const createDebouncedSaveAll = (
  playthroughsStore: PlaythroughsState,
  getActivePlaythrough: () => Playthrough | null
) => {
  return debounce(
    async (state: PlaythroughsState): Promise<void> => {
      if (typeof window === 'undefined') return;

      try {
        playthroughsStore.isSaving = true;

        const activePlaythrough = getActivePlaythrough();
        const saveOperations: Promise<void>[] = [];

        // Save active playthrough ID
        if (state.activePlaythroughId) {
          saveOperations.push(
            set(
              ACTIVE_PLAYTHROUGH_KEY,
              state.activePlaythroughId,
              playthroughsStore_idb
            )
          );
        } else {
          saveOperations.push(
            del(ACTIVE_PLAYTHROUGH_KEY, playthroughsStore_idb)
          );
        }

        // Save the active playthrough data if it exists
        if (activePlaythrough) {
          // Update timestamp right before saving to avoid blocking UI updates
          activePlaythrough.updatedAt = Date.now();
          const plainPlaythrough = serializeForStorage(activePlaythrough);
          saveOperations.push(
            set(activePlaythrough.id, plainPlaythrough, playthroughsStore_idb)
          );

          // Check if we need to update playthrough IDs list
          const updatePlaythroughIds = async () => {
            const playthroughIds = ((await get(
              'playthrough_ids',
              playthroughsStore_idb
            )) || []) as string[];
            if (!playthroughIds.includes(activePlaythrough.id)) {
              playthroughIds.push(activePlaythrough.id);
              await set(
                'playthrough_ids',
                playthroughIds,
                playthroughsStore_idb
              );
            }
          };
          saveOperations.push(updatePlaythroughIds());
        }

        // Execute all save operations in parallel
        await Promise.all(saveOperations);
      } catch (error) {
        console.error('Failed to save to IndexedDB:', error);
      } finally {
        playthroughsStore.isSaving = false;
      }
    },
    200,
    { edges: ['leading'] }
  );
};

export const loadFromIndexedDB = async (
  createDefaultPlaythrough: () => Playthrough
): Promise<PlaythroughsState> => {
  const defaultState: PlaythroughsState = {
    playthroughs: [],
    activePlaythroughId: undefined,
    isLoading: true,
    isSaving: false,
  };

  if (typeof window === 'undefined') return defaultState;

  try {
    // Load active playthrough ID and available playthrough IDs in parallel
    const [activePlaythroughId, availablePlaythroughIds] = await Promise.all([
      get(ACTIVE_PLAYTHROUGH_KEY, playthroughsStore_idb),
      get('playthrough_ids', playthroughsStore_idb).then(
        ids => (ids || []) as string[]
      ),
    ]);

    let activePlaythrough: Playthrough | null = null;

    // Only load the active playthrough data if we have an active ID
    if (
      activePlaythroughId &&
      availablePlaythroughIds.includes(activePlaythroughId)
    ) {
      try {
        const playthroughData = await get(
          activePlaythroughId,
          playthroughsStore_idb
        );
        if (playthroughData) {
          activePlaythrough = PlaythroughSchema.parse(playthroughData);
        }
      } catch (error) {
        console.error(
          `Failed to load active playthrough ${activePlaythroughId}:`,
          error instanceof ZodError
            ? z.prettifyError(error)
            : error instanceof Error
              ? error.message
              : String(error)
        );
      }
    }

    // If no active playthrough exists or failed to load, create a default one
    if (!activePlaythrough) {
      activePlaythrough = createDefaultPlaythrough();

      // Save the new default playthrough immediately - all operations in parallel
      await Promise.all([
        set(
          activePlaythrough.id,
          serializeForStorage(activePlaythrough),
          playthroughsStore_idb
        ),
        set('playthrough_ids', [activePlaythrough.id], playthroughsStore_idb),
        set(
          ACTIVE_PLAYTHROUGH_KEY,
          activePlaythrough.id,
          playthroughsStore_idb
        ),
      ]);
    }

    // Return state with only the active playthrough loaded
    return {
      playthroughs: [activePlaythrough],
      activePlaythroughId: activePlaythrough.id,
      isLoading: false,
      isSaving: false,
    };
  } catch (error) {
    console.error('Failed to load playthroughs from IndexedDB:', error);
    return defaultState;
  }
};
