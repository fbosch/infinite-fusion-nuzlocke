import { proxy, subscribe } from 'valtio';
import { z } from 'zod';
import { get, set, del } from 'idb-keyval';
import { debounce } from 'lodash';
import { PokemonOptionSchema } from '../loaders/pokemon';

export const EncounterDataSchema = z.object({
  head: PokemonOptionSchema.nullable(),
  body: PokemonOptionSchema.nullable(),
  isFusion: z.boolean(),
});

// Zod schema for a single playthrough
export const PlaythroughSchema = z.object({
  id: z.string(),
  name: z.string(),
  encounters: z.record(z.string(), EncounterDataSchema.nullable()),
  remixMode: z.boolean().default(false),
  createdAt: z.number(),
  updatedAt: z.number(),
});

// Zod schema for the playthroughs store
export const PlaythroughsSchema = z.object({
  playthroughs: z.array(PlaythroughSchema),
  activePlaythroughId: z.string().optional(),
});

export type Playthrough = z.infer<typeof PlaythroughSchema>;
export type PlaythroughsState = z.infer<typeof PlaythroughsSchema> & {
  isLoading: boolean;
};

// Default state
const defaultState: PlaythroughsState = {
  playthroughs: [],
  activePlaythroughId: undefined,
  isLoading: true, // Start in loading state
};

// Storage keys
const ACTIVE_PLAYTHROUGH_KEY = 'activePlaythroughId';

// Simple cache for active playthrough to avoid repeated find() calls
let cachedActivePlaythrough: Playthrough | null = null;
let cachedActiveId: string | undefined = undefined;

// Track the last change that might affect the active playthrough
let lastActivePlaythroughUpdate = 0;

// Helper functions
const generatePlaythroughId = (): string => {
  return `playthrough_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const getCurrentTimestamp = (): number => {
  return Date.now();
};

// More efficient cache invalidation - only clear when necessary
const invalidateActivePlaythroughCache = () => {
  cachedActivePlaythrough = null;
  cachedActiveId = undefined;
  lastActivePlaythroughUpdate = Date.now();
};

// Check if cache is still valid
const isCacheValid = (): boolean => {
  return (
    cachedActiveId === playthroughsStore.activePlaythroughId &&
    cachedActivePlaythrough !== null
  );
};

// Default playthrough creation
const createDefaultPlaythrough = (): Playthrough => ({
  id: generatePlaythroughId(),
  name: 'Nuzlocke',
  encounters: {},
  remixMode: false,
  createdAt: getCurrentTimestamp(),
  updatedAt: getCurrentTimestamp(),
});

// More efficient serialization: Use structuredClone when available, fallback to JSON
const serializeForStorage = (obj: unknown): unknown => {
  if (typeof structuredClone !== 'undefined') {
    try {
      return structuredClone(obj);
    } catch {
      // Fallback to JSON if structured clone fails
    }
  }
  return JSON.parse(JSON.stringify(obj));
};

// Consolidated debounced save function for better performance
const debouncedSaveAll = debounce(
  async (state: PlaythroughsState): Promise<void> => {
    if (typeof window === 'undefined') return;

    try {
      const activePlaythrough = playthroughActions.getActivePlaythrough();
      const saveOperations: Promise<void>[] = [];

      // Save active playthrough ID
      if (state.activePlaythroughId) {
        saveOperations.push(
          set(ACTIVE_PLAYTHROUGH_KEY, state.activePlaythroughId)
        );
      } else {
        saveOperations.push(del(ACTIVE_PLAYTHROUGH_KEY));
      }

      // Save the active playthrough data if it exists
      if (activePlaythrough) {
        const plainPlaythrough = serializeForStorage(activePlaythrough);
        saveOperations.push(set(activePlaythrough.id, plainPlaythrough));

        // Check if we need to update playthrough IDs list
        const updatePlaythroughIds = async () => {
          const playthroughIds = ((await get('playthrough_ids')) ||
            []) as string[];
          if (!playthroughIds.includes(activePlaythrough.id)) {
            playthroughIds.push(activePlaythrough.id);
            await set('playthrough_ids', playthroughIds);
          }
        };
        saveOperations.push(updatePlaythroughIds());
      }

      // Execute all save operations in parallel
      await Promise.all(saveOperations);
    } catch (error) {
      console.error('Failed to save to IndexedDB:', error);
    }
  },
  500
); // 500ms delay - adjust as needed

// Keep the old functions for backwards compatibility but mark as deprecated
const debouncedSaveToIndexedDB = debouncedSaveAll;

// Immediate save function for critical operations
const saveToIndexedDB = async (state: PlaythroughsState): Promise<void> => {
  if (typeof window === 'undefined') return;

  try {
    // Save active playthrough ID
    if (state.activePlaythroughId) {
      await set(ACTIVE_PLAYTHROUGH_KEY, state.activePlaythroughId);
    } else {
      await del(ACTIVE_PLAYTHROUGH_KEY);
    }
  } catch (error) {
    console.error('Failed to save playthroughs to IndexedDB:', error);
  }
};

const debouncedSavePlaythrough = debounce(
  async (playthrough: Playthrough): Promise<void> => {
    if (typeof window === 'undefined') return;

    try {
      const plainPlaythrough = serializeForStorage(playthrough);
      const saveOperations: Promise<void>[] = [
        set(playthrough.id, plainPlaythrough),
      ];

      // Check if we need to update playthrough IDs list
      const updatePlaythroughIds = async () => {
        const playthroughIds = ((await get('playthrough_ids')) ||
          []) as string[];
        if (!playthroughIds.includes(playthrough.id)) {
          playthroughIds.push(playthrough.id);
          await set('playthrough_ids', playthroughIds);
        }
      };
      saveOperations.push(updatePlaythroughIds());

      // Execute all save operations in parallel
      await Promise.all(saveOperations);
    } catch (error) {
      console.error(
        `Failed to save playthrough ${playthrough.id} to IndexedDB:`,
        error
      );
      console.error('Error details:', error);
    }
  },
  500
); // 500ms delay for playthrough saves

// Lazy loading helpers
const loadPlaythroughById = async (
  playthroughId: string
): Promise<Playthrough | null> => {
  if (typeof window === 'undefined') return null;

  try {
    const playthroughData = await get(playthroughId);
    if (playthroughData) {
      return PlaythroughSchema.parse(playthroughData);
    }
    return null;
  } catch (error) {
    console.error(`Failed to load playthrough ${playthroughId}:`, error);
    return null;
  }
};

const loadAllPlaythroughs = async (): Promise<Playthrough[]> => {
  if (typeof window === 'undefined') return [];

  try {
    const availablePlaythroughIds = ((await get('playthrough_ids')) ||
      []) as string[];

    // Load all playthroughs in parallel
    const playthroughPromises =
      availablePlaythroughIds.map(loadPlaythroughById);
    const results = await Promise.all(playthroughPromises);

    return results.filter((p): p is Playthrough => p !== null);
  } catch (error) {
    console.error('Failed to load all playthroughs:', error);
    return [];
  }
};

// Delete individual playthrough from IndexedDB
const deletePlaythroughFromIndexedDB = async (
  playthroughId: string
): Promise<void> => {
  if (typeof window === 'undefined') return;

  try {
    // Get current playthrough IDs and prepare delete operations
    const playthroughIds = ((await get('playthrough_ids')) || []) as string[];
    const updatedIds = playthroughIds.filter(
      (id: string) => id !== playthroughId
    );

    // Run delete and update operations in parallel
    await Promise.all([del(playthroughId), set('playthrough_ids', updatedIds)]);
  } catch (error) {
    console.error(
      `Failed to delete playthrough ${playthroughId} from IndexedDB:`,
      error
    );
  }
};

const loadFromIndexedDB = async (): Promise<PlaythroughsState> => {
  if (typeof window === 'undefined') return defaultState;

  try {
    // Load active playthrough ID and available playthrough IDs in parallel
    const [activePlaythroughId, availablePlaythroughIds] = await Promise.all([
      get(ACTIVE_PLAYTHROUGH_KEY),
      get('playthrough_ids').then(ids => (ids || []) as string[]),
    ]);

    let activePlaythrough: Playthrough | null = null;

    // Only load the active playthrough data if we have an active ID
    if (
      activePlaythroughId &&
      availablePlaythroughIds.includes(activePlaythroughId)
    ) {
      try {
        const playthroughData = await get(activePlaythroughId);
        if (playthroughData) {
          activePlaythrough = PlaythroughSchema.parse(playthroughData);
        }
      } catch (error) {
        console.error(
          `Failed to load active playthrough ${activePlaythroughId}:`,
          error
        );
      }
    }

    // If no active playthrough exists or failed to load, create a default one
    if (!activePlaythrough) {
      activePlaythrough = createDefaultPlaythrough();

      // Save the new default playthrough immediately - all operations in parallel
      await Promise.all([
        set(activePlaythrough.id, serializeForStorage(activePlaythrough)),
        set('playthrough_ids', [activePlaythrough.id]),
        set(ACTIVE_PLAYTHROUGH_KEY, activePlaythrough.id),
      ]);
    }

    // Return state with only the active playthrough loaded
    return {
      playthroughs: [activePlaythrough],
      activePlaythroughId: activePlaythrough.id,
      isLoading: false,
    };
  } catch (error) {
    console.error('Failed to load playthroughs from IndexedDB:', error);
    return defaultState;
  }
};

// Create the playthroughs store with proper SSR handling
let playthroughsStore: PlaythroughsState;

if (typeof window !== 'undefined') {
  // Client-side: Initialize with default state first, then load from IndexedDB
  playthroughsStore = proxy<PlaythroughsState>(defaultState);

  // Load data from IndexedDB asynchronously
  loadFromIndexedDB().then(loadedState => {
    Object.assign(playthroughsStore, loadedState);
    // Ensure loading state is set to false
    playthroughsStore.isLoading = false;
  });

  // Subscribe to store changes and debounce saves
  subscribe(playthroughsStore, () => {
    // Only invalidate cache if the active playthrough ID changed or
    // if we don't have a cached active playthrough
    const currentActiveId = playthroughsStore.activePlaythroughId;
    if (cachedActiveId !== currentActiveId) {
      invalidateActivePlaythroughCache();
    }

    // Use requestIdleCallback to defer save operations when browser is idle
    window.requestIdleCallback(
      () => {
        debouncedSaveAll(playthroughsStore);
      },
      { timeout: 2000 } // Reduced timeout for better responsiveness
    );
  });
} else {
  // Server-side: Create a dummy store
  playthroughsStore = proxy<PlaythroughsState>(defaultState);
}

export { playthroughsStore };

// Playthrough actions
export const playthroughActions = {
  // Create a new playthrough
  createPlaythrough: (name: string, remixMode: boolean = false): string => {
    const newPlaythrough: Playthrough = {
      id: generatePlaythroughId(),
      name,
      encounters: {},
      remixMode,
      createdAt: getCurrentTimestamp(),
      updatedAt: getCurrentTimestamp(),
    };

    playthroughsStore.playthroughs.push(newPlaythrough);

    // Set as active if it's the first playthrough
    if (playthroughsStore.playthroughs.length === 1) {
      playthroughsStore.activePlaythroughId = newPlaythrough.id;
    }

    return newPlaythrough.id;
  },

  // Get active playthrough with simple caching
  getActivePlaythrough: (): Playthrough | null => {
    if (!playthroughsStore.activePlaythroughId) return null;

    // Use simple cache to avoid repeated find() operations
    if (isCacheValid()) {
      return cachedActivePlaythrough;
    }

    // Find and cache the active playthrough
    const found =
      playthroughsStore.playthroughs.find(
        (p: Playthrough) => p.id === playthroughsStore.activePlaythroughId
      ) || null;

    if (found) {
      cachedActivePlaythrough = found;
      cachedActiveId = playthroughsStore.activePlaythroughId;
    }

    return found;
  },

  // Set active playthrough
  setActivePlaythrough: async (playthroughId: string) => {
    // Check if the playthrough is already loaded
    let playthrough = playthroughsStore.playthroughs.find(
      (p: Playthrough) => p.id === playthroughId
    );

    // If not loaded, try to load it
    if (!playthrough) {
      const loadedPlaythrough = await loadPlaythroughById(playthroughId);
      if (loadedPlaythrough) {
        playthroughsStore.playthroughs.push(loadedPlaythrough);
        playthrough = loadedPlaythrough;
      }
    }

    if (playthrough) {
      playthroughsStore.activePlaythroughId = playthroughId;
    }
  },

  // Toggle remix mode for active playthrough
  toggleRemixMode: () => {
    const activePlaythrough = playthroughActions.getActivePlaythrough();
    if (activePlaythrough) {
      activePlaythrough.remixMode = !activePlaythrough.remixMode;
      activePlaythrough.updatedAt = getCurrentTimestamp();
    }
  },

  // Set remix mode for active playthrough
  setRemixMode: (enabled: boolean) => {
    const activePlaythrough = playthroughActions.getActivePlaythrough();
    if (activePlaythrough) {
      activePlaythrough.remixMode = enabled;
      activePlaythrough.updatedAt = getCurrentTimestamp();
    }
  },

  // Update playthrough name
  updatePlaythroughName: (playthroughId: string, name: string) => {
    const playthrough = playthroughsStore.playthroughs.find(
      (p: Playthrough) => p.id === playthroughId
    );

    if (playthrough) {
      playthrough.name = name;
      playthrough.updatedAt = getCurrentTimestamp();
    }
  },

  // Delete playthrough
  deletePlaythrough: async (playthroughId: string) => {
    const index = playthroughsStore.playthroughs.findIndex(
      (p: Playthrough) => p.id === playthroughId
    );

    if (index !== -1) {
      playthroughsStore.playthroughs.splice(index, 1);

      // If we deleted the active playthrough, set a new active one
      if (playthroughsStore.activePlaythroughId === playthroughId) {
        playthroughsStore.activePlaythroughId =
          playthroughsStore.playthroughs.length > 0
            ? playthroughsStore.playthroughs[0].id
            : undefined;
      }

      // Delete from IndexedDB immediately (this is a destructive operation)
      await deletePlaythroughFromIndexedDB(playthroughId);
    }
  },

  // Get all playthroughs (loads them if not already loaded)
  getAllPlaythroughs: async (): Promise<Playthrough[]> => {
    // Load all available playthroughs and merge with currently loaded ones
    const allPlaythroughs = await loadAllPlaythroughs();

    // Update the store with all loaded playthroughs
    playthroughsStore.playthroughs = allPlaythroughs;

    return [...allPlaythroughs];
  },

  // Get available playthrough IDs without loading the full data
  getAvailablePlaythroughIds: async (): Promise<string[]> => {
    if (typeof window === 'undefined') return [];

    try {
      return ((await get('playthrough_ids')) || []) as string[];
    } catch (error) {
      console.error('Failed to get available playthrough IDs:', error);
      return [];
    }
  },

  // Get currently loaded playthroughs without triggering additional loads
  getCurrentlyLoadedPlaythroughs: (): Playthrough[] => {
    return [...playthroughsStore.playthroughs];
  },

  // Check if active playthrough has remix mode enabled
  isRemixModeEnabled: (): boolean => {
    const activePlaythrough = playthroughActions.getActivePlaythrough();
    return activePlaythrough?.remixMode || false;
  },

  // Reset all playthroughs
  resetAllPlaythroughs: async () => {
    // Delete all existing playthroughs from IndexedDB in parallel
    const deletePromises = playthroughsStore.playthroughs.map(playthrough =>
      deletePlaythroughFromIndexedDB(playthrough.id)
    );
    await Promise.all(deletePromises);

    // Create a new default playthrough instead of leaving empty
    const defaultPlaythrough = createDefaultPlaythrough();
    playthroughsStore.playthroughs = [defaultPlaythrough];
    playthroughsStore.activePlaythroughId = defaultPlaythrough.id;
  },

  // Encounter management actions

  // Get encounters for active playthrough
  getEncounters: (): Playthrough['encounters'] => {
    const activePlaythrough = playthroughActions.getActivePlaythrough();
    return activePlaythrough?.encounters || {};
  },

  // Update encounter for a location
  updateEncounter: (
    locationId: string,
    pokemon: z.infer<typeof PokemonOptionSchema> | null,
    field: 'head' | 'body' = 'head',
    shouldCreateFusion: boolean = false
  ) => {
    const activePlaythrough = playthroughActions.getActivePlaythrough();
    if (!activePlaythrough) {
      return;
    }

    // Get or create encounter - avoid unnecessary object creation
    let encounter = activePlaythrough.encounters[locationId];
    if (!encounter) {
      encounter = {
        head: null,
        body: null,
        isFusion: shouldCreateFusion,
      };
      activePlaythrough.encounters[locationId] = encounter;
    }

    // Set originalLocation if pokemon is provided and doesn't already have one
    const pokemonWithLocation =
      pokemon && !pokemon.originalLocation
        ? { ...pokemon, originalLocation: locationId }
        : pokemon;

    if (shouldCreateFusion || encounter.isFusion) {
      // For fusion encounters, update the specified field and ensure isFusion is true
      encounter[field] = pokemonWithLocation;
      encounter.isFusion = true;
    } else {
      // For regular encounters, set head and ensure isFusion is false
      encounter.head = pokemonWithLocation;
      encounter.body = null;
      encounter.isFusion = false;
    }

    activePlaythrough.updatedAt = getCurrentTimestamp();
  },

  // Reset encounter for a location
  resetEncounter: (locationId: string) => {
    const activePlaythrough = playthroughActions.getActivePlaythrough();
    if (!activePlaythrough) return;

    delete activePlaythrough.encounters[locationId];
    activePlaythrough.updatedAt = getCurrentTimestamp();
  },

  // Toggle fusion mode for an encounter
  toggleEncounterFusion: (locationId: string) => {
    const activePlaythrough = playthroughActions.getActivePlaythrough();
    if (!activePlaythrough) return;

    const currentEncounter = activePlaythrough.encounters[locationId] || {
      head: null,
      body: null,
      isFusion: false,
    };

    // Simply toggle the isFusion flag without modifying head/body
    activePlaythrough.encounters[locationId] = {
      ...currentEncounter,
      isFusion: !currentEncounter.isFusion,
    };

    activePlaythrough.updatedAt = getCurrentTimestamp();
  },

  // Create fusion from drag and drop
  createFusion: (
    locationId: string,
    head: z.infer<typeof PokemonOptionSchema>,
    body: z.infer<typeof PokemonOptionSchema>
  ) => {
    const activePlaythrough = playthroughActions.getActivePlaythrough();
    if (!activePlaythrough) return;

    activePlaythrough.encounters[locationId] = {
      head,
      body,
      isFusion: true,
    };

    activePlaythrough.updatedAt = getCurrentTimestamp();
  },

  // Force immediate save (for critical operations)
  forceSave: async () => {
    if (typeof window === 'undefined') return;
    await debouncedSaveAll(playthroughsStore);
  },

  // Helper methods for drag and drop operations

  // Clear encounter from a specific location (replaces clearCombobox event)
  clearEncounterFromLocation: (locationId: string, field?: 'head' | 'body') => {
    const activePlaythrough = playthroughActions.getActivePlaythrough();
    if (!activePlaythrough) return;

    const encounter = activePlaythrough.encounters[locationId];
    if (!encounter) return;

    if (!field) {
      // If no field specified, clear the entire encounter
      delete activePlaythrough.encounters[locationId];
    } else {
      // Clear only the specified field
      encounter[field] = null;

      // Only remove the entire encounter if it's not a fusion and we're clearing the head
      // OR if it's a regular encounter (not a fusion) and both are null
      if (!encounter.isFusion) {
        if (field === 'head' || (!encounter.head && !encounter.body)) {
          delete activePlaythrough.encounters[locationId];
        }
      }
      // For fusions, keep the encounter structure even if both head and body are null
    }

    activePlaythrough.updatedAt = getCurrentTimestamp();
  },

  // Move encounter from one location to another (replaces some clearCombobox usage)
  moveEncounter: (
    fromLocationId: string,
    toLocationId: string,
    pokemon: z.infer<typeof PokemonOptionSchema>,
    toField: 'head' | 'body' = 'head'
  ) => {
    const activePlaythrough = playthroughActions.getActivePlaythrough();
    if (!activePlaythrough) return;

    // Clear the source location
    delete activePlaythrough.encounters[fromLocationId];

    // Set the destination
    playthroughActions.updateEncounter(toLocationId, pokemon, toField, false);
  },

  // Swap encounters between two locations (replaces switchCombobox event)
  swapEncounters: (
    locationId1: string,
    locationId2: string,
    field1: 'head' | 'body' = 'head',
    field2: 'head' | 'body' = 'head'
  ) => {
    const activePlaythrough = playthroughActions.getActivePlaythrough();
    if (!activePlaythrough) return;

    const encounter1 = activePlaythrough.encounters[locationId1];
    const encounter2 = activePlaythrough.encounters[locationId2];

    if (!encounter1 || !encounter2) return;

    const pokemon1 = field1 === 'head' ? encounter1.head : encounter1.body;
    const pokemon2 = field2 === 'head' ? encounter2.head : encounter2.body;

    if (!pokemon1 || !pokemon2) return;

    // Update originalLocation for swapped Pokemon
    const pokemon1WithLocation = {
      ...pokemon1,
      originalLocation: pokemon1.originalLocation || locationId2,
    };
    const pokemon2WithLocation = {
      ...pokemon2,
      originalLocation: pokemon2.originalLocation || locationId1,
    };

    // Directly swap the Pokemon while preserving encounter structure
    if (field1 === 'head') {
      encounter1.head = pokemon2WithLocation;
    } else {
      encounter1.body = pokemon2WithLocation;
    }

    if (field2 === 'head') {
      encounter2.head = pokemon1WithLocation;
    } else {
      encounter2.body = pokemon1WithLocation;
    }

    activePlaythrough.updatedAt = getCurrentTimestamp();
  },

  // Get location ID from combobox ID (helper for drag operations)
  getLocationFromComboboxId: (
    comboboxId: string
  ): { locationId: string; field: 'head' | 'body' } => {
    if (comboboxId.endsWith('-head')) {
      return { locationId: comboboxId.replace('-head', ''), field: 'head' };
    }
    if (comboboxId.endsWith('-body')) {
      return { locationId: comboboxId.replace('-body', ''), field: 'body' };
    }
    if (comboboxId.endsWith('-single')) {
      return { locationId: comboboxId.replace('-single', ''), field: 'head' };
    }
    // Fallback - assume it's just the location ID
    return { locationId: comboboxId, field: 'head' };
  },
};
