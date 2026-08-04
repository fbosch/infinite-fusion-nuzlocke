import { debounce } from "es-toolkit";
import { createStore, del, get, keys, set } from "idb-keyval";
import type {
  Playthrough,
  PlaythroughsState,
} from "@/stores/playthroughs/types";
import { createDefaultPlaythrough } from "./defaultPlaythrough";
import { normalizePersistedPlaythrough } from "./migrations";

// Create a custom store for playthroughs data
const PLAYTHROUGHS_DATABASE = "playthroughs";
const PLAYTHROUGHS_STORE = "data";

export const playthroughsStore_idb = createStore(
  PLAYTHROUGHS_DATABASE,
  PLAYTHROUGHS_STORE,
);

let playthroughsStoreInitialization: Promise<void> | undefined;

const openPlaythroughsDatabase = (version?: number): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    let isBlocked = false;
    const request =
      version === undefined
        ? indexedDB.open(PLAYTHROUGHS_DATABASE)
        : indexedDB.open(PLAYTHROUGHS_DATABASE, version);

    request.onupgradeneeded = () => {
      if (
        request.result.objectStoreNames.contains(PLAYTHROUGHS_STORE) === false
      ) {
        request.result.createObjectStore(PLAYTHROUGHS_STORE);
      }
    };
    request.onblocked = () => {
      isBlocked = true;
      reject(
        new Error("Playthrough storage upgrade is blocked by another tab"),
      );
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      if (isBlocked) {
        request.result.close();
        return;
      }

      resolve(request.result);
    };
  });

const ensurePlaythroughsStore = (): Promise<void> => {
  if (typeof indexedDB === "undefined") {
    return Promise.resolve();
  }

  if (playthroughsStoreInitialization) {
    return playthroughsStoreInitialization;
  }

  playthroughsStoreInitialization = (async () => {
    const database = await openPlaythroughsDatabase();
    if (database.objectStoreNames.contains(PLAYTHROUGHS_STORE)) {
      database.close();
      return;
    }

    const nextVersion = database.version + 1;
    database.close();

    const upgradedDatabase = await openPlaythroughsDatabase(nextVersion);
    upgradedDatabase.close();
  })().catch((error) => {
    playthroughsStoreInitialization = undefined;
    throw error;
  });

  return playthroughsStoreInitialization;
};

// Storage keys
export const ACTIVE_PLAYTHROUGH_KEY = "activePlaythroughId";

// LocalStorage helpers for active playthrough ID
const getLocalStorage = (): Storage | null => {
  if (typeof window === "undefined") return null;

  try {
    return globalThis.localStorage;
  } catch {
    return null;
  }
};

const getActivePlaythroughId = (): string | null => {
  const storage = getLocalStorage();
  return typeof storage?.getItem === "function"
    ? storage.getItem(ACTIVE_PLAYTHROUGH_KEY)
    : null;
};

const setActivePlaythroughId = (id: string): void => {
  const storage = getLocalStorage();
  if (typeof storage?.setItem === "function") {
    storage.setItem(ACTIVE_PLAYTHROUGH_KEY, id);
  }
};

const removeActivePlaythroughId = (): void => {
  const storage = getLocalStorage();
  if (typeof storage?.removeItem === "function") {
    storage.removeItem(ACTIVE_PLAYTHROUGH_KEY);
  }
};

// Migration function to move activePlaythroughId from IndexedDB to LocalStorage
const migrateActivePlaythroughId = async (): Promise<string | null> => {
  if (typeof window === "undefined") return null;

  // Check if we already have the value in LocalStorage
  const localStorageValue = getActivePlaythroughId();
  if (localStorageValue) {
    return localStorageValue;
  }

  try {
    await ensurePlaythroughsStore();
    // Try to get the value from IndexedDB
    const indexedDBValue = await get(
      ACTIVE_PLAYTHROUGH_KEY,
      playthroughsStore_idb,
    );

    if (indexedDBValue && typeof indexedDBValue === "string") {
      // Migrate to LocalStorage
      setActivePlaythroughId(indexedDBValue);

      // Clean up the old IndexedDB entry
      await del(ACTIVE_PLAYTHROUGH_KEY, playthroughsStore_idb);

      console.log(
        "Migrated activePlaythroughId from IndexedDB to LocalStorage",
      );
      return indexedDBValue;
    }
  } catch (error) {
    console.warn(
      "Failed to migrate activePlaythroughId from IndexedDB:",
      error,
    );
  }

  return null;
};

// More efficient serialization: Use structuredClone when available, fallback to JSON
const serializeForStorage = (obj: unknown): unknown => {
  if (typeof structuredClone !== "undefined") {
    try {
      return structuredClone(obj);
    } catch {
      // Fallback to JSON if structured clone fails
    }
  }
  return JSON.parse(JSON.stringify(obj));
};

export const loadPlaythroughById = async (
  playthroughId: string,
): Promise<Playthrough | null> => {
  if (typeof window === "undefined") return null;

  try {
    await ensurePlaythroughsStore();
    const playthroughData = await get(playthroughId, playthroughsStore_idb);
    if (playthroughData) {
      return normalizePersistedPlaythrough(playthroughData);
    }
    return null;
  } catch (error) {
    console.error(`Failed to load playthrough ${playthroughId}:`, error);
    return null;
  }
};

export const loadAllPlaythroughs = async (): Promise<Playthrough[]> => {
  if (typeof window === "undefined") return [];

  try {
    await ensurePlaythroughsStore();
    // Get all keys from IndexedDB and filter out non-playthrough keys
    const allKeys = await keys(playthroughsStore_idb);
    const playthroughIds = allKeys.filter(
      (key): key is string =>
        typeof key === "string" && key !== ACTIVE_PLAYTHROUGH_KEY,
    );

    // Load all playthroughs in parallel
    const playthroughPromises = playthroughIds.map(async (id) => {
      try {
        const playthroughData = await get(id, playthroughsStore_idb);
        if (playthroughData) {
          return normalizePersistedPlaythrough(playthroughData);
        }
      } catch (error) {
        console.error(`Failed to load playthrough ${id}:`, error);
      }

      return null;
    });

    const results = await Promise.all(playthroughPromises);

    return results.filter(
      (p: Playthrough | null): p is Playthrough => p !== null,
    );
  } catch (error) {
    console.error(
      "Failed to load all playthroughs:",
      error instanceof Error ? error.message : String(error),
    );
    return [];
  }
};

// Delete individual playthrough from IndexedDB
export const deletePlaythroughFromIndexedDB = async (
  playthroughId: string,
): Promise<void> => {
  if (typeof window === "undefined") return;

  try {
    await ensurePlaythroughsStore();
    // Simply delete the playthrough - no need to maintain ID list
    await del(playthroughId, playthroughsStore_idb);
  } catch (error) {
    console.error(
      `Failed to delete playthrough ${playthroughId} from IndexedDB:`,
      error,
    );
  }
};

// Immediate save function for critical operations
export const saveToIndexedDB = async (
  state: PlaythroughsState,
): Promise<void> => {
  if (typeof window === "undefined") return;

  try {
    // Save active playthrough ID to LocalStorage for faster access
    if (state.activePlaythroughId) {
      setActivePlaythroughId(state.activePlaythroughId);
    } else {
      removeActivePlaythroughId();
    }
  } catch (error) {
    console.error("Failed to save playthroughs to IndexedDB:", error);
  }
};

// Factory function to create debounced save function
export const createDebouncedSaveAll = (
  playthroughsStore: PlaythroughsState,
  getActivePlaythrough: () => Playthrough | null,
) => {
  return debounce(
    async (state: PlaythroughsState): Promise<void> => {
      if (typeof window === "undefined") return;

      try {
        await ensurePlaythroughsStore();
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
            set(activePlaythrough.id, plainPlaythrough, playthroughsStore_idb),
          );
        }

        // Execute all save operations in parallel
        await Promise.all(saveOperations);
      } catch (error) {
        console.error("Failed to save to IndexedDB:", error);
      } finally {
        playthroughsStore.isSaving = false;
      }
    },
    200,
    { edges: ["leading"] },
  );
};

// Load all data from IndexedDB
export const loadFromIndexedDB = async (
  playthroughsStore: PlaythroughsState,
): Promise<void> => {
  if (typeof window === "undefined") return;

  try {
    await ensurePlaythroughsStore();
    playthroughsStore.isLoading = true;

    // Load all playthroughs
    const allPlaythroughs = await loadAllPlaythroughs();
    playthroughsStore.playthroughs = allPlaythroughs;

    // Migrate and load active playthrough ID from LocalStorage (with fallback to IndexedDB)
    const activePlaythroughId = await migrateActivePlaythroughId();

    if (
      activePlaythroughId &&
      allPlaythroughs.find((p) => p.id === activePlaythroughId)
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
        playthroughsStore_idb,
      );
    }
  } catch (error) {
    console.error("Failed to load from IndexedDB:", error);

    // Fallback: create a default playthrough if loading fails
    const defaultPlaythrough = createDefaultPlaythrough();
    playthroughsStore.playthroughs.push(defaultPlaythrough);
    playthroughsStore.activePlaythroughId = defaultPlaythrough.id;
    setActivePlaythroughId(defaultPlaythrough.id);
  } finally {
    playthroughsStore.isLoading = false;
  }
};
