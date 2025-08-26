import { get, set, del, createStore, keys } from 'idb-keyval';
import { debounce } from 'es-toolkit';
import { z, ZodError } from 'zod';
import type {
  PlaythroughsState,
  Playthrough,
} from '@/stores/playthroughs/types';
import { PlaythroughSchema } from '@/stores/playthroughs/types';
import { migratePlaythrough } from './migrations';

// Create a custom store for playthroughs data
export const playthroughsStore_idb = createStore('playthroughs', 'data');

// Storage keys
export const ACTIVE_PLAYTHROUGH_KEY = 'activePlaythroughId';

// Local createDefaultPlaythrough function
const createDefaultPlaythrough = (): Playthrough => ({
  id: `playthrough_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  name: 'Nuzlocke',
  encounters: {},
  team: { members: Array.from({ length: 6 }, () => null) },
  gameMode: 'classic',
  version: '1.0.0',
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

// LocalStorage helpers for active playthrough ID
export const getActivePlaythroughId = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACTIVE_PLAYTHROUGH_KEY);
};

export const setActivePlaythroughId = (id: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACTIVE_PLAYTHROUGH_KEY, id);
};

export const removeActivePlaythroughId = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACTIVE_PLAYTHROUGH_KEY);
};

// Migration function to move activePlaythroughId from IndexedDB to LocalStorage
export const migrateActivePlaythroughId = async (): Promise<string | null> => {
  if (typeof window === 'undefined') return null;

  // Check if we already have the value in LocalStorage
  const localStorageValue = getActivePlaythroughId();
  if (localStorageValue) {
    return localStorageValue;
  }

  try {
    // Try to get the value from IndexedDB
    const indexedDBValue = await get(
      ACTIVE_PLAYTHROUGH_KEY,
      playthroughsStore_idb
    );

    if (indexedDBValue && typeof indexedDBValue === 'string') {
      // Migrate to LocalStorage
      setActivePlaythroughId(indexedDBValue);

      // Clean up the old IndexedDB entry
      await del(ACTIVE_PLAYTHROUGH_KEY, playthroughsStore_idb);

      console.log(
        'Migrated activePlaythroughId from IndexedDB to LocalStorage'
      );
      return indexedDBValue;
    }
  } catch (error) {
    console.warn(
      'Failed to migrate activePlaythroughId from IndexedDB:',
      error
    );
  }

  return null;
};

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
      const migratedPlaythrough = await migratePlaythrough(playthroughData);
      return PlaythroughSchema.parse(migratedPlaythrough);
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
    // Get all keys from IndexedDB and filter out non-playthrough keys
    const allKeys = await keys(playthroughsStore_idb);
    const playthroughIds = allKeys.filter(
      (key): key is string =>
        typeof key === 'string' && key !== ACTIVE_PLAYTHROUGH_KEY
    );

    // Load all playthroughs in parallel
    const playthroughPromises = playthroughIds.map(async id => {
      const playthroughData = await get(id, playthroughsStore_idb);
      if (playthroughData) {
        const migratedPlaythrough = await migratePlaythrough(playthroughData);
        return PlaythroughSchema.parse(migratedPlaythrough);
      }
      return null;
    });

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
    // Simply delete the playthrough - no need to maintain ID list
    await del(playthroughId, playthroughsStore_idb);
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
    // Save active playthrough ID to LocalStorage for faster access
    if (state.activePlaythroughId) {
      setActivePlaythroughId(state.activePlaythroughId);
    } else {
      removeActivePlaythroughId();
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

        // Save active playthrough ID to LocalStorage for faster access
        if (state.activePlaythroughId) {
          setActivePlaythroughId(state.activePlaythroughId);
        } else {
          removeActivePlaythroughId();
        }

        // Save the active playthrough data if it exists
        if (activePlaythrough) {
          // Update timestamp right before saving to avoid blocking UI updates
          activePlaythrough.updatedAt = Date.now();
          const plainPlaythrough = serializeForStorage(activePlaythrough);
          saveOperations.push(
            set(activePlaythrough.id, plainPlaythrough, playthroughsStore_idb)
          );
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

// Load all data from IndexedDB
export const loadFromIndexedDB = async (
  playthroughsStore: PlaythroughsState
): Promise<void> => {
  if (typeof window === 'undefined') return;

  try {
    playthroughsStore.isLoading = true;

    // Load all playthroughs
    const allPlaythroughs = await loadAllPlaythroughs();
    playthroughsStore.playthroughs = allPlaythroughs;

    // Migrate and load active playthrough ID from LocalStorage (with fallback to IndexedDB)
    const activePlaythroughId = await migrateActivePlaythroughId();

    if (
      activePlaythroughId &&
      allPlaythroughs.find(p => p.id === activePlaythroughId)
    ) {
      playthroughsStore.activePlaythroughId = activePlaythroughId;
    } else if (allPlaythroughs.length > 0) {
      // If no valid active playthrough, use the first available one
      const firstPlaythroughId = allPlaythroughs[0].id;
      playthroughsStore.activePlaythroughId = firstPlaythroughId;
      setActivePlaythroughId(firstPlaythroughId);
    } else {
      // No playthroughs exist, create a default one
      const defaultPlaythrough = createDefaultPlaythrough();
      playthroughsStore.playthroughs.push(defaultPlaythrough);
      playthroughsStore.activePlaythroughId = defaultPlaythrough.id;
      setActivePlaythroughId(defaultPlaythrough.id);

      // Save the default playthrough
      await set(
        defaultPlaythrough.id,
        serializeForStorage(defaultPlaythrough),
        playthroughsStore_idb
      );
    }
  } catch (error) {
    console.error('Failed to load from IndexedDB:', error);

    // Fallback: create a default playthrough if loading fails
    const defaultPlaythrough = createDefaultPlaythrough();
    playthroughsStore.playthroughs.push(defaultPlaythrough);
    playthroughsStore.activePlaythroughId = defaultPlaythrough.id;
    setActivePlaythroughId(defaultPlaythrough.id);
  } finally {
    playthroughsStore.isLoading = false;
  }
};
