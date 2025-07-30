import { proxy, subscribe, useSnapshot } from 'valtio';
import { devtools } from 'valtio/utils';
import { z, ZodError } from 'zod';
import { get, set, del, createStore } from 'idb-keyval';
import { debounce } from 'es-toolkit';
import React, { useMemo } from 'react';
import { PokemonOptionSchema, generatePokemonUID } from '@/loaders/pokemon';
import { CustomLocationSchema } from '@/loaders/locations';
import spriteService from '@/services/spriteService';

// Create a custom store for playthroughs data
const playthroughsStore_idb = createStore('playthroughs', 'data');

// Game mode enum schema
export const GameModeSchema = z.enum(['classic', 'remix', 'randomized']);

export type GameMode = z.infer<typeof GameModeSchema>;

export const EncounterDataSchema = z.object({
  head: PokemonOptionSchema.nullish(),
  body: PokemonOptionSchema.nullish(),
  isFusion: z.boolean(),
  artworkVariant: z.string().optional(),
  updatedAt: z.number(),
});

// Zod schema for a single playthrough
export const PlaythroughSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    customLocations: z.array(CustomLocationSchema).optional(),
    encounters: z.record(z.string(), EncounterDataSchema).optional(),
    gameMode: GameModeSchema.default('classic'),
    // Keep remixMode for backward compatibility during migration
    remixMode: z.boolean().optional(),
    createdAt: z.number(),
    updatedAt: z.number(),
  })
  .transform(data => {
    // Migration logic: if remixMode exists but gameMode is default, migrate
    if (data.remixMode !== undefined && data.gameMode === 'classic') {
      return {
        ...data,
        gameMode: data.remixMode ? 'remix' : 'classic',
        remixMode: undefined, // Remove the old field
      };
    }

    // Remove remixMode if it exists (clean up)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { remixMode, ...cleanData } = data;
    return cleanData;
  });

// Zod schema for the playthroughs store
export const PlaythroughsSchema = z.object({
  playthroughs: z.array(PlaythroughSchema),
  activePlaythroughId: z.string().optional(),
});

export type Playthrough = z.infer<typeof PlaythroughSchema>;
export type PlaythroughsState = z.infer<typeof PlaythroughsSchema> & {
  isLoading: boolean;
  isSaving: boolean;
};

// Default state
const defaultState: PlaythroughsState = {
  playthroughs: [],
  activePlaythroughId: undefined,
  isLoading: true, // Start in loading state
  isSaving: false,
};

// Storage keys
const ACTIVE_PLAYTHROUGH_KEY = 'activePlaythroughId';

// Simple cache for active playthrough to avoid repeated find() calls
let cachedActivePlaythrough: Playthrough | null = null;
let cachedActiveId: string | undefined = undefined;

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
  gameMode: 'classic',
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
      playthroughsStore.isSaving = true;

      const activePlaythrough = playthroughActions.getActivePlaythrough();
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
        saveOperations.push(del(ACTIVE_PLAYTHROUGH_KEY, playthroughsStore_idb));
      }

      // Save the active playthrough data if it exists
      if (activePlaythrough) {
        // Update timestamp right before saving to avoid blocking UI updates
        activePlaythrough.updatedAt = getCurrentTimestamp();
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
            await set('playthrough_ids', playthroughIds, playthroughsStore_idb);
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

// Immediate save function for critical operations
const saveToIndexedDB = async (state: PlaythroughsState): Promise<void> => {
  if (typeof window === 'undefined') return;

  try {
    playthroughsStore.isSaving = true;

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
  } finally {
    playthroughsStore.isSaving = false;
  }
};

const loadPlaythroughById = async (
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

const loadAllPlaythroughs = async (): Promise<Playthrough[]> => {
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

    return results.filter((p): p is Playthrough => p !== null);
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
const deletePlaythroughFromIndexedDB = async (
  playthroughId: string
): Promise<void> => {
  if (typeof window === 'undefined') return;

  try {
    playthroughsStore.isSaving = true;

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
  } finally {
    playthroughsStore.isSaving = false;
  }
};

const loadFromIndexedDB = async (): Promise<PlaythroughsState> => {
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

// Create the playthroughs store with proper SSR handling
let playthroughsStore: PlaythroughsState;

if (typeof window !== 'undefined') {
  // Client-side: Initialize with default state first, then load from IndexedDB
  playthroughsStore = proxy<PlaythroughsState>(defaultState);

  // Add devtools integration for debugging
  if (process.env.NODE_ENV === 'development') {
    devtools(playthroughsStore, { name: 'Playthroughs Store' });
  }

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
    debouncedSaveAll(playthroughsStore);
  });
} else {
  // Server-side: Create a dummy store
  playthroughsStore = proxy<PlaythroughsState>(defaultState);
}

export { playthroughsStore };

// Playthrough actions
export const playthroughActions = {
  // Helper function to consistently apply and cache preferred variants
  applyPreferredVariant: async (
    encounter: z.infer<typeof EncounterDataSchema>,
    force: boolean = false
  ): Promise<void> => {
    try {
      // Only apply if we don't already have a variant or if forced
      if (!force && encounter.artworkVariant !== undefined) {
        return;
      }

      let preferredVariant: string | undefined;

      if (encounter.isFusion && encounter.head && encounter.body) {
        // For fusion encounters with both parts
        preferredVariant = await playthroughActions.getPreferredVariant(
          encounter.head.id,
          encounter.body.id
        );
      } else {
        preferredVariant = await playthroughActions.getPreferredVariant(
          encounter.head?.id || encounter.body?.id
        );
      }
      // Only update if we got a variant - don't clear existing variant to undefined
      if (preferredVariant !== undefined) {
        encounter.artworkVariant = preferredVariant;
      }
    } catch (error) {
      console.warn('Failed to apply preferred variant:', error);
      // Don't clear on error - keep existing variant
    }
  },

  // Create a new playthrough
  createPlaythrough: (name: string, gameMode: GameMode = 'classic'): string => {
    const newPlaythrough: Playthrough = {
      id: generatePlaythroughId(),
      name,
      encounters: {},
      gameMode,
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
      // Force cache invalidation immediately when switching playthroughs
      invalidateActivePlaythroughCache();
    }
  },

  // Cycle through game modes for active playthrough
  cycleGameMode: () => {
    const activePlaythrough = playthroughActions.getActivePlaythrough();
    if (activePlaythrough) {
      const modes = ['classic', 'remix', 'randomized'] as const;
      const currentIndex = modes.indexOf(
        activePlaythrough.gameMode as (typeof modes)[number]
      );
      const nextIndex = (currentIndex + 1) % modes.length;
      const nextMode = modes[nextIndex];
      activePlaythrough.gameMode = nextMode;
      // Don't update timestamp immediately for UI toggles - let the debounced save handle it
      // This makes the UI more responsive for rapid toggles
    }
  },

  // Toggle remix mode for backward compatibility (will be deprecated)
  toggleRemixMode: () => {
    const activePlaythrough = playthroughActions.getActivePlaythrough();
    if (activePlaythrough) {
      // Convert current mode to boolean logic for backward compatibility
      const isRemix = activePlaythrough.gameMode === 'remix';
      activePlaythrough.gameMode = isRemix ? 'classic' : 'remix';
      // Don't update timestamp immediately for UI toggles - let the debounced save handle it
    }
  },

  // Set game mode for active playthrough
  setGameMode: (gameMode: GameMode) => {
    const activePlaythrough = playthroughActions.getActivePlaythrough();
    if (activePlaythrough) {
      activePlaythrough.gameMode = gameMode;
      activePlaythrough.updatedAt = getCurrentTimestamp();
    }
  },

  // Set remix mode for backward compatibility (will be deprecated)
  setRemixMode: (enabled: boolean) => {
    const activePlaythrough = playthroughActions.getActivePlaythrough();
    if (activePlaythrough) {
      activePlaythrough.gameMode = enabled ? 'remix' : 'classic';
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

    // Merge with existing playthroughs instead of replacing the entire array
    // This preserves Valtio's reactivity
    const existingIds = new Set(playthroughsStore.playthroughs.map(p => p.id));

    // Add new playthroughs that aren't already loaded
    for (const playthrough of allPlaythroughs) {
      if (!existingIds.has(playthrough.id)) {
        playthroughsStore.playthroughs.push(playthrough);
      }
    }

    // Remove playthroughs that no longer exist
    const loadedIds = new Set(allPlaythroughs.map(p => p.id));
    for (let i = playthroughsStore.playthroughs.length - 1; i >= 0; i--) {
      if (!loadedIds.has(playthroughsStore.playthroughs[i].id)) {
        playthroughsStore.playthroughs.splice(i, 1);
      }
    }

    return [...allPlaythroughs];
  },

  // Get available playthrough IDs without loading the full data
  getAvailablePlaythroughIds: async (): Promise<string[]> => {
    if (typeof window === 'undefined') return [];

    try {
      return ((await get('playthrough_ids', playthroughsStore_idb)) ||
        []) as string[];
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
    return activePlaythrough?.gameMode === 'remix';
  },

  // Get current game mode
  getGameMode: (): GameMode => {
    const activePlaythrough = playthroughActions.getActivePlaythrough();
    return (activePlaythrough?.gameMode as GameMode) || 'classic';
  },

  // Check if active playthrough is in randomized mode
  isRandomizedModeEnabled: (): boolean => {
    const activePlaythrough = playthroughActions.getActivePlaythrough();
    return activePlaythrough?.gameMode === 'randomized';
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

  // Create encounter data with preferred variant prefilled
  createEncounterData: async (
    pokemon: z.infer<typeof PokemonOptionSchema> | null,
    field: 'head' | 'body' = 'head',
    shouldCreateFusion: boolean = false,
    locationId?: string
  ): Promise<z.infer<typeof EncounterDataSchema>> => {
    const pokemonWithLocationAndUID = pokemon
      ? {
          ...pokemon,
          originalLocation: pokemon.originalLocation ?? locationId ?? '',
          uid: pokemon.uid || generatePokemonUID(),
        }
      : null;

    // Pre-fetch preferred variant based on the encounter configuration
    let preferredVariant: string | undefined;
    if (pokemonWithLocationAndUID) {
      if (shouldCreateFusion) {
        if (field === 'head') {
          // Fusion with only head
          preferredVariant = await playthroughActions.getPreferredVariant(
            pokemonWithLocationAndUID.id
          );
        } else {
          // Fusion with only body
          preferredVariant = await playthroughActions.getPreferredVariant(
            null,
            pokemonWithLocationAndUID.id
          );
        }
      } else {
        // Regular encounter (non-fusion)
        preferredVariant = await playthroughActions.getPreferredVariant(
          pokemonWithLocationAndUID.id
        );
      }
    }

    // Create encounter data with pre-fetched variant
    const encounterData: z.infer<typeof EncounterDataSchema> = {
      head:
        shouldCreateFusion && field === 'head'
          ? pokemonWithLocationAndUID
          : !shouldCreateFusion
            ? pokemonWithLocationAndUID
            : null,
      body:
        shouldCreateFusion && field === 'body'
          ? pokemonWithLocationAndUID
          : null,
      isFusion: shouldCreateFusion,
      artworkVariant: preferredVariant, // Set immediately - no async delay!
      updatedAt: getCurrentTimestamp(),
    };

    return encounterData;
  },

  // Get encounters for active playthrough
  getEncounters: (): Playthrough['encounters'] => {
    const activePlaythrough = playthroughActions.getActivePlaythrough();
    return activePlaythrough?.encounters || {};
  },

  // Update encounter for a location
  updateEncounter: async (
    locationId: string,
    pokemon: z.infer<typeof PokemonOptionSchema> | null,
    field: 'head' | 'body' = 'head',
    shouldCreateFusion: boolean = false
  ) => {
    const activePlaythrough = playthroughActions.getActivePlaythrough();
    if (!activePlaythrough) {
      return;
    }

    // Ensure encounters object exists
    if (!activePlaythrough.encounters) {
      activePlaythrough.encounters = {};
    }

    // Get or create encounter
    let encounter = activePlaythrough.encounters[locationId];
    if (!encounter) {
      // Pre-create encounter data with preferred variant
      const encounterData = await playthroughActions.createEncounterData(
        pokemon,
        field,
        shouldCreateFusion,
        locationId
      );
      encounter = encounterData;
      activePlaythrough.encounters[locationId] = encounter;
      return; // Early return since createEncounterData already handles preferred variants
    }

    // Handle both setting and clearing pokemon
    if (pokemon) {
      const pokemonWithLocationAndUID = {
        ...pokemon,
        originalLocation: pokemon.originalLocation ?? locationId,
        uid: pokemon.uid || generatePokemonUID(),
      };

      // Pre-fetch preferred variant for the new encounter state to avoid flickering
      let preferredVariant: string | undefined;

      // Determine if this should be a fusion encounter
      const willBeFusion = shouldCreateFusion || encounter.isFusion;

      if (willBeFusion) {
        // For fusion encounters
        const newHead =
          field === 'head' ? pokemonWithLocationAndUID : encounter.head;
        const newBody =
          field === 'body' ? pokemonWithLocationAndUID : encounter.body;

        if (newHead && newBody) {
          preferredVariant = await playthroughActions.getPreferredVariant(
            newHead.id,
            newBody.id
          );
        } else if (newHead) {
          preferredVariant = await playthroughActions.getPreferredVariant(
            newHead.id
          );
        } else if (newBody) {
          preferredVariant = await playthroughActions.getPreferredVariant(
            newBody.id
          );
        }
      } else {
        // For regular encounters
        preferredVariant = await playthroughActions.getPreferredVariant(
          pokemonWithLocationAndUID.id
        );
      }

      // Now update the encounter with pre-fetched variant
      if (willBeFusion) {
        encounter[field] = pokemonWithLocationAndUID;
        encounter.isFusion = true; // Preserve or set fusion state
        encounter.artworkVariant = preferredVariant;

        // Default behavior: If setting status on one part of a fusion and the other part
        // doesn't have a status, set both to the same status
        if (
          pokemonWithLocationAndUID.status &&
          encounter.head &&
          encounter.body
        ) {
          const otherField = field === 'head' ? 'body' : 'head';
          const otherPokemon = encounter[otherField];

          if (otherPokemon && !otherPokemon.status) {
            encounter[otherField] = {
              ...otherPokemon,
              status: pokemonWithLocationAndUID.status,
            };
          }
        }
      } else {
        // For regular encounters
        encounter.head = pokemonWithLocationAndUID;
        encounter.body = null;
        encounter.isFusion = false;
        encounter.artworkVariant = preferredVariant;
      }

      encounter.updatedAt = getCurrentTimestamp();
    } else {
      // Handle clearing pokemon - pre-fetch variant for remaining pokemon
      const remainingPokemon =
        field === 'head' ? encounter.body : encounter.head;
      let preferredVariant: string | undefined;

      if (remainingPokemon) {
        preferredVariant = await playthroughActions.getPreferredVariant(
          remainingPokemon.id
        );
      }

      encounter[field] = null;
      encounter.artworkVariant = preferredVariant;
      encounter.updatedAt = getCurrentTimestamp();
    }
  },

  // Reset encounter for a location
  resetEncounter: (locationId: string) => {
    const activePlaythrough = playthroughActions.getActivePlaythrough();
    if (!activePlaythrough) return;

    // Ensure encounters object exists
    if (!activePlaythrough.encounters) {
      activePlaythrough.encounters = {};
    }

    delete activePlaythrough.encounters[locationId];
    // Note: No need to update timestamp since encounter is deleted
  },

  // Toggle fusion mode for an encounter
  toggleEncounterFusion: async (locationId: string) => {
    const activePlaythrough = playthroughActions.getActivePlaythrough();
    if (!activePlaythrough) return;

    // Ensure encounters object exists
    if (!activePlaythrough.encounters) {
      activePlaythrough.encounters = {};
    }

    // Get existing encounter or create default
    const currentEncounter = activePlaythrough.encounters[locationId];
    const existingEncounter = currentEncounter || {
      head: null,
      body: null,
      isFusion: false,
      updatedAt: getCurrentTimestamp(),
    };

    const newIsFusion = !existingEncounter.isFusion;

    // When unfusing (going from fusion to non-fusion)
    if (existingEncounter.isFusion && !newIsFusion) {
      // If head is empty but body has data, move body to head
      if (!existingEncounter.head && existingEncounter.body) {
        const newEncounter = {
          head: existingEncounter.body,
          body: null,
          isFusion: false,
          artworkVariant: existingEncounter.artworkVariant, // Preserve existing variant
          updatedAt: getCurrentTimestamp(),
        };
        activePlaythrough.encounters[locationId] = newEncounter;
        await playthroughActions.applyPreferredVariant(newEncounter, true);
      } else {
        // If both slots have data or only head has data, preserve as-is
        const newEncounter = {
          ...existingEncounter,
          isFusion: false,
          updatedAt: getCurrentTimestamp(),
        };
        activePlaythrough.encounters[locationId] = newEncounter;
        await playthroughActions.applyPreferredVariant(newEncounter, true);
      }
    } else {
      // When fusing (going from non-fusion to fusion) or other cases
      const newEncounter = {
        ...existingEncounter,
        isFusion: newIsFusion,
        updatedAt: getCurrentTimestamp(),
      };
      activePlaythrough.encounters[locationId] = newEncounter;
      await playthroughActions.applyPreferredVariant(newEncounter, true);
    }
  },

  // Flip head and body in a fusion encounter atomically
  flipEncounterFusion: async (locationId: string) => {
    const activePlaythrough = playthroughActions.getActivePlaythrough();
    if (!activePlaythrough) return;

    // Ensure encounters object exists
    if (!activePlaythrough.encounters) {
      activePlaythrough.encounters = {};
    }

    const encounter = activePlaythrough.encounters[locationId];
    if (!encounter || !encounter.isFusion) return;

    // Swap head and body atomically
    const originalHead = encounter.head;
    const originalBody = encounter.body;

    encounter.head = originalBody;
    encounter.body = originalHead;
    encounter.updatedAt = getCurrentTimestamp();

    // Apply preferred variant for the new composition
    await playthroughActions.applyPreferredVariant(encounter, true);
  },

  // Move encounter atomically from source to destination (for drag and drop)
  moveEncounterAtomic: async (
    sourceLocationId: string,
    sourceField: 'head' | 'body',
    targetLocationId: string,
    targetField: 'head' | 'body',
    pokemon: z.infer<typeof PokemonOptionSchema>
  ) => {
    const activePlaythrough = playthroughActions.getActivePlaythrough();
    if (!activePlaythrough) return;

    // Ensure encounters object exists
    if (!activePlaythrough.encounters) {
      activePlaythrough.encounters = {};
    }

    // Check if we're moving within the same encounter
    const isIntraEncounterMove = sourceLocationId === targetLocationId;

    // Pre-fetch the preferred variant for the target encounter to avoid flickering
    const pokemonWithLocationAndUID = {
      ...pokemon,
      originalLocation: pokemon.originalLocation ?? targetLocationId,
      uid: pokemon.uid || generatePokemonUID(),
    };

    // Check if target location has an existing encounter and preserve its fusion state
    const existingTargetEncounter =
      activePlaythrough.encounters[targetLocationId];
    const willBeFusion =
      targetField === 'body' || existingTargetEncounter?.isFusion === true;

    // Pre-fetch preferred variant based on final encounter state
    let preferredVariant: string | undefined;

    if (isIntraEncounterMove && existingTargetEncounter) {
      // Moving within same encounter - preserve existing variant since composition doesn't change
      preferredVariant = existingTargetEncounter.artworkVariant;
    } else {
      // Moving between different encounters - look up preferred variant
      if (willBeFusion) {
        if (targetField === 'head') {
          // For fusion with pokemon in head slot
          const existingBody = existingTargetEncounter?.body;
          if (existingBody) {
            preferredVariant = await playthroughActions.getPreferredVariant(
              pokemonWithLocationAndUID.id,
              existingBody.id
            );
          } else {
            preferredVariant = await playthroughActions.getPreferredVariant(
              pokemonWithLocationAndUID.id
            );
          }
        } else {
          // For fusion with pokemon in body slot
          const existingHead = existingTargetEncounter?.head;
          if (existingHead) {
            preferredVariant = await playthroughActions.getPreferredVariant(
              existingHead.id,
              pokemonWithLocationAndUID.id
            );
          } else {
            preferredVariant = await playthroughActions.getPreferredVariant(
              null,
              pokemonWithLocationAndUID.id
            );
          }
        }
      } else {
        // For non-fusion (head field), the pokemon will be in head slot
        preferredVariant = await playthroughActions.getPreferredVariant(
          pokemonWithLocationAndUID.id
        );
      }
    }

    // Clear source first to avoid duplicates
    await playthroughActions.clearEncounterFromLocation(
      sourceLocationId,
      sourceField
    );

    // Create the target encounter with the pre-fetched variant, preserving existing pokemon
    const newEncounter: z.infer<typeof EncounterDataSchema> = {
      head:
        targetField === 'head'
          ? pokemonWithLocationAndUID
          : existingTargetEncounter?.head || null,
      body:
        targetField === 'body'
          ? pokemonWithLocationAndUID
          : existingTargetEncounter?.body || null,
      isFusion: willBeFusion,
      artworkVariant: preferredVariant, // Set immediately - no flicker!
      updatedAt: getCurrentTimestamp(),
    };

    activePlaythrough.encounters[targetLocationId] = newEncounter;
  },

  // Create fusion from drag and drop
  createFusion: async (
    locationId: string,
    head: z.infer<typeof PokemonOptionSchema>,
    body: z.infer<typeof PokemonOptionSchema>
  ) => {
    const activePlaythrough = playthroughActions.getActivePlaythrough();
    if (!activePlaythrough) return;

    // Ensure encounters object exists
    if (!activePlaythrough.encounters) {
      activePlaythrough.encounters = {};
    }

    // Preserve originalLocation - never overwrite once set!
    const headWithLocation = {
      ...head,
      originalLocation: head.originalLocation ?? locationId,
      uid: head.uid || generatePokemonUID(),
    };

    const bodyWithLocation = {
      ...body,
      originalLocation: body.originalLocation ?? locationId,
      uid: body.uid || generatePokemonUID(),
    };

    const encounter = {
      head: headWithLocation,
      body: bodyWithLocation,
      isFusion: true,
      updatedAt: getCurrentTimestamp(),
    };

    activePlaythrough.encounters[locationId] = encounter;
    await playthroughActions.applyPreferredVariant(encounter, true);
  },

  // Set artwork variant for an encounter
  setArtworkVariant: (locationId: string, variant?: string) => {
    const activePlaythrough = playthroughActions.getActivePlaythrough();
    if (!activePlaythrough) return;

    // Ensure encounters object exists
    if (!activePlaythrough.encounters) {
      activePlaythrough.encounters = {};
    }

    const encounter = activePlaythrough.encounters[locationId];
    if (!encounter) return;

    // Update encounter timestamp for artwork variant changes
    encounter.artworkVariant = variant;
    encounter.updatedAt = getCurrentTimestamp();

    // Always update the preferred variant cache when manually setting variants
    spriteService
      .setPreferredVariant(encounter.head?.id, encounter.body?.id, variant)
      .catch((error: unknown) => {
        console.warn('Failed to set preferred variant in cache:', error);
      });
  },

  // Set preferred variant for a Pokémon or fusion (updates cache only, doesn't affect current encounters)
  setPreferredVariant: async (
    headId?: number | null,
    bodyId?: number | null,
    variant?: string
  ): Promise<void> => {
    if (variant !== undefined) {
      try {
        await spriteService.setPreferredVariant(headId, bodyId, variant);
      } catch (error) {
        console.warn('Failed to set preferred variant in cache:', error);
      }
    }
  },

  // Get preferred variant for a Pokémon or fusion
  getPreferredVariant: async (
    headId?: number | null,
    bodyId?: number | null
  ): Promise<string | undefined> => {
    try {
      return await spriteService.getPreferredVariant(headId, bodyId);
    } catch (error) {
      console.warn('Failed to get preferred variant from cache:', error);
      return undefined;
    }
  },

  // Prefetch adjacent artwork variants for better UX
  prefetchAdjacentVariants: async (
    headId?: number,
    bodyId?: number,
    currentVariant?: string,
    availableVariants?: string[]
  ) => {
    try {
      // Get available variants if not provided
      const variants =
        availableVariants ||
        (await spriteService.getArtworkVariants(headId, bodyId));

      // Early return if no variants or only one variant
      if (!variants || variants.length <= 1) return;

      // Find current variant index
      const currentIndex = variants.indexOf(currentVariant || '');

      // Calculate adjacent indices (next and previous)
      const nextIndex = (currentIndex + 1) % variants.length;
      const prevIndex = (currentIndex - 1 + variants.length) % variants.length;

      // Get the adjacent variants
      const adjacentVariants = [
        variants[nextIndex],
        variants[prevIndex],
      ].filter(variant => variant && variant !== currentVariant);

      // Prefetch the adjacent variant images
      const prefetchPromises = adjacentVariants.map(variant => () => {
        try {
          const imageUrl = spriteService.generateSpriteUrl(
            headId,
            bodyId,
            variant
          );
          // Create new Image object to trigger prefetch
          const img = new Image();
          img.setAttribute('decoding', 'async');
          img.src = imageUrl;
          // Optionally handle load/error events
          img.onload = () => {
            console.debug(`Prefetched variant: ${variant}`);
          };
          img.onerror = () => {
            console.warn(`Failed to prefetch variant: ${variant}`);
          };
        } catch (error) {
          console.warn(`Failed to get URL for variant ${variant}:`, error);
        }
      });

      window.requestAnimationFrame(() => {
        prefetchPromises.forEach(p => p());
      });

      // Execute prefetch operations in parallel (no need for await since we're just triggering prefetch)
    } catch (error) {
      console.warn('Failed to prefetch adjacent variants:', error);
    }
  },

  // Cycle through artwork variants for encounters (with validation)
  cycleArtworkVariant: async (locationId: string, reverse: boolean = false) => {
    const activePlaythrough = playthroughActions.getActivePlaythrough();
    if (!activePlaythrough?.encounters) return;

    const encounter = activePlaythrough.encounters[locationId];
    if (!encounter) return;

    try {
      // Cache the service import to avoid repeated dynamic imports
      const { default: spriteService } = await import(
        '@/services/spriteService'
      );

      const availableVariants = await spriteService.getArtworkVariants(
        encounter.head?.id,
        encounter.body?.id
      );

      // Early return if no variants or only default
      if (!availableVariants || availableVariants.length <= 1) return;

      // Calculate next variant index
      const currentVariant = encounter.artworkVariant || '';
      const currentIndex = availableVariants.indexOf(currentVariant);
      const nextIndex = reverse
        ? (currentIndex - 1 + availableVariants.length) %
          availableVariants.length
        : (currentIndex + 1) % availableVariants.length;

      // Update encounter with new variant and timestamp
      const newVariant = availableVariants[nextIndex] || undefined;
      encounter.artworkVariant = newVariant;
      encounter.updatedAt = getCurrentTimestamp();

      // Set the preferred variant in the cache for future use
      if (newVariant !== undefined) {
        spriteService
          .setPreferredVariant(
            encounter.head?.id,
            encounter.body?.id,
            newVariant
          )
          .catch((error: unknown) => {
            console.warn('Failed to set preferred variant in cache:', error);
          });
      }

      // Prefetch adjacent variants for smoother cycling
      if (availableVariants.length > 2) {
        playthroughActions
          .prefetchAdjacentVariants(
            encounter.head?.id,
            encounter.body?.id,
            newVariant,
            availableVariants
          )
          .catch(error => {
            console.warn('Failed to prefetch adjacent variants:', error);
          });
      }
    } catch (error) {
      console.error('Failed to cycle artwork variant:', error);
      encounter.artworkVariant = undefined;
      encounter.updatedAt = getCurrentTimestamp();
    }
  },

  // Force immediate save (for critical operations)
  forceSave: async () => {
    if (typeof window === 'undefined') return;
    await saveToIndexedDB(playthroughsStore);
  },

  // Preload artwork variants for all encounters in the current playthrough
  preloadArtworkVariants: async () => {
    const activePlaythrough = playthroughActions.getActivePlaythrough();
    if (!activePlaythrough) return;

    // Ensure encounters object exists
    if (!activePlaythrough.encounters) {
      activePlaythrough.encounters = {};
    }

    // Get all encounters that need variant preloading
    const encountersToPreload = Object.entries(
      activePlaythrough.encounters
    ).filter(([, encounter]) => {
      // Include fusion encounters with both head and body
      if (encounter.isFusion && encounter.head && encounter.body) {
        return true;
      }
      // Include single Pokémon encounters
      if (!encounter.isFusion && encounter.head) {
        return true;
      }
      return false;
    });

    if (encountersToPreload.length === 0) {
      console.debug('No encounters found to preload variants for');
      return;
    }

    console.debug(
      `Preloading artwork variants for ${encountersToPreload.length} encounters...`
    );

    try {
      // Import the sprite service
      const { default: spriteService } = await import(
        '@/services/spriteService'
      );

      // Process encounters in small batches to avoid overwhelming the server
      const batchSize = 3;
      for (let i = 0; i < encountersToPreload.length; i += batchSize) {
        const batch = encountersToPreload.slice(i, i + batchSize);

        const batchPromises = batch.map(([, encounter]) => {
          if (encounter.isFusion && encounter.head && encounter.body) {
            // Fusion encounter
            return spriteService
              .getArtworkVariants(encounter.head.id, encounter.body.id)
              .catch((error: unknown) => {
                console.warn(
                  `Failed to preload fusion variants ${encounter.head!.id}.${encounter.body!.id}:`,
                  error
                );
              });
          } else if (encounter.head) {
            // Single Pokémon encounter
            return spriteService
              .getArtworkVariants(encounter.head.id)
              .catch((error: unknown) => {
                console.warn(
                  `Failed to preload Pokémon variants ${encounter.head!.id}:`,
                  error
                );
              });
          }
          return Promise.resolve();
        });

        await Promise.all(batchPromises);

        // Add a small delay between batches to be respectful to the server
        if (i + batchSize < encountersToPreload.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      console.debug('Artwork variant preloading completed');
    } catch (error) {
      console.error('Failed to preload artwork variants:', error);
    }
  },

  // Helper methods for drag and drop operations

  // Clear encounter from a specific location (replaces clearCombobox event)
  clearEncounterFromLocation: async (
    locationId: string,
    field?: 'head' | 'body'
  ) => {
    const activePlaythrough = playthroughActions.getActivePlaythrough();
    if (!activePlaythrough) return;

    // Ensure encounters object exists
    if (!activePlaythrough.encounters) {
      activePlaythrough.encounters = {};
    }

    const encounter = activePlaythrough.encounters[locationId];
    if (!encounter) return;

    if (!field) {
      // If no field specified, clear the entire encounter
      delete activePlaythrough.encounters![locationId];
      // No encounter timestamp to update since it's deleted
    } else {
      // Clear only the specified field
      encounter[field] = null;

      // When clearing part of a fusion, look up preferred variant for remaining pokemon
      if (encounter.isFusion) {
        const remainingPokemon =
          field === 'head' ? encounter.body : encounter.head;
        if (remainingPokemon) {
          // Get preferred variant for the remaining pokemon
          const preferredVariant = await playthroughActions.getPreferredVariant(
            remainingPokemon.id
          );
          encounter.artworkVariant = preferredVariant;
        } else {
          // No remaining pokemon, can clear variant
          encounter.artworkVariant = undefined;
        }
      }

      // Only remove the entire encounter if it's not a fusion and we're clearing the head
      // OR if it's a regular encounter (not a fusion) and both are null
      if (!encounter.isFusion) {
        if (field === 'head' || (!encounter.head && !encounter.body)) {
          delete activePlaythrough.encounters![locationId];
          // No encounter timestamp to update since it's deleted
        } else {
          // Update encounter timestamp for partial clearing
          encounter.updatedAt = getCurrentTimestamp();
        }
      } else {
        // For fusions, keep the encounter structure and update timestamp
        encounter.updatedAt = getCurrentTimestamp();
      }
    }
  },

  // Move encounter from one location to another (replaces some clearCombobox usage)
  moveEncounter: async (
    fromLocationId: string,
    toLocationId: string,
    pokemon: z.infer<typeof PokemonOptionSchema>,
    toField: 'head' | 'body' = 'head'
  ) => {
    const activePlaythrough = playthroughActions.getActivePlaythrough();
    if (!activePlaythrough) return;

    // Ensure encounters object exists
    if (!activePlaythrough.encounters) {
      activePlaythrough.encounters = {};
    }

    // Clear the source location
    delete activePlaythrough.encounters[fromLocationId];

    // Create the destination encounter with pokemon in the correct field
    const pokemonWithLocationAndUID = {
      ...pokemon,
      originalLocation: pokemon.originalLocation ?? toLocationId,
      uid: pokemon.uid || generatePokemonUID(),
    };

    // Create new encounter
    const newEncounter: z.infer<typeof EncounterDataSchema> = {
      head: toField === 'head' ? pokemonWithLocationAndUID : null,
      body: toField === 'body' ? pokemonWithLocationAndUID : null,
      isFusion: toField === 'body', // If we're setting body field, it's a fusion
      updatedAt: getCurrentTimestamp(),
    };

    activePlaythrough.encounters[toLocationId] = newEncounter;

    // Apply the preferred variant from global cache
    await playthroughActions.applyPreferredVariant(newEncounter, true);
  },

  // Swap encounters between two locations (replaces switchCombobox event)
  swapEncounters: async (
    locationId1: string,
    locationId2: string,
    field1: 'head' | 'body' = 'head',
    field2: 'head' | 'body' = 'head'
  ) => {
    const activePlaythrough = playthroughActions.getActivePlaythrough();
    if (!activePlaythrough) return;

    // Ensure encounters object exists
    if (!activePlaythrough.encounters) {
      activePlaythrough.encounters = {};
    }

    const encounter1 = activePlaythrough.encounters[locationId1];
    const encounter2 = activePlaythrough.encounters[locationId2];

    if (!encounter1 || !encounter2) return;

    const pokemon1 = field1 === 'head' ? encounter1.head : encounter1.body;
    const pokemon2 = field2 === 'head' ? encounter2.head : encounter2.body;

    if (!pokemon1 || !pokemon2) return;

    // Preserve originalLocation for swapped Pokemon - never overwrite!
    const pokemon1WithLocation = {
      ...pokemon1,
      originalLocation: pokemon1.originalLocation ?? locationId2,
    };
    const pokemon2WithLocation = {
      ...pokemon2,
      originalLocation: pokemon2.originalLocation ?? locationId1,
    };

    // Directly swap the Pokemon
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

    // Apply preferred variants only if needed, without clearing first
    await Promise.all([
      playthroughActions.applyPreferredVariant(encounter1, true),
      playthroughActions.applyPreferredVariant(encounter2, true),
    ]);

    // Update both encounter timestamps since they were swapped
    const timestamp = getCurrentTimestamp();
    encounter1.updatedAt = timestamp;
    encounter2.updatedAt = timestamp;
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

  // Custom location management actions

  // Add a custom location to the active playthrough
  addCustomLocation: async (
    name: string,
    afterLocationId: string
  ): Promise<string | null> => {
    const activePlaythrough = playthroughActions.getActivePlaythrough();
    if (!activePlaythrough) return null;

    try {
      const { createCustomLocation } = await import('@/loaders/locations');

      // Ensure customLocations array exists
      if (!activePlaythrough.customLocations) {
        activePlaythrough.customLocations = [];
      }

      const newCustomLocation = createCustomLocation(
        name,
        afterLocationId,
        activePlaythrough.customLocations
      );

      // Create a new array instead of mutating the existing one to ensure reactivity
      activePlaythrough.customLocations = [
        ...activePlaythrough.customLocations,
        newCustomLocation,
      ];
      activePlaythrough.updatedAt = getCurrentTimestamp();

      return newCustomLocation.id;
    } catch (error) {
      console.error('Failed to add custom location:', error);
      return null;
    }
  },

  // Remove a custom location from the active playthrough
  removeCustomLocation: (customLocationId: string): boolean => {
    const activePlaythrough = playthroughActions.getActivePlaythrough();
    if (!activePlaythrough || !activePlaythrough.customLocations) return false;

    const index = activePlaythrough.customLocations.findIndex(
      loc => loc.id === customLocationId
    );

    if (index !== -1) {
      // Create a new array without the custom location to ensure reactivity
      activePlaythrough.customLocations =
        activePlaythrough.customLocations.filter(
          loc => loc.id !== customLocationId
        );

      // Also remove any encounters associated with this custom location
      if (
        activePlaythrough.encounters &&
        activePlaythrough.encounters[customLocationId]
      ) {
        delete activePlaythrough.encounters[customLocationId];
      }

      activePlaythrough.updatedAt = getCurrentTimestamp();
      return true;
    }

    return false;
  },

  // Update a custom location's name
  updateCustomLocationName: (
    customLocationId: string,
    newName: string
  ): boolean => {
    const activePlaythrough = playthroughActions.getActivePlaythrough();
    if (!activePlaythrough || !activePlaythrough.customLocations) return false;

    const customLocation = activePlaythrough.customLocations.find(
      loc => loc.id === customLocationId
    );

    if (customLocation) {
      customLocation.name = newName.trim();
      activePlaythrough.updatedAt = getCurrentTimestamp();
      return true;
    }

    return false;
  },

  // Get custom locations for the active playthrough
  getCustomLocations: (): z.infer<typeof CustomLocationSchema>[] => {
    const activePlaythrough = playthroughActions.getActivePlaythrough();
    return activePlaythrough?.customLocations || [];
  },

  // Validate if a custom location can be placed after a specific location
  validateCustomLocationPlacement: async (
    afterLocationId: string
  ): Promise<boolean> => {
    const activePlaythrough = playthroughActions.getActivePlaythrough();
    if (!activePlaythrough) return false;

    try {
      const { validateCustomLocationPlacement } = await import(
        '@/loaders/locations'
      );
      return validateCustomLocationPlacement(
        afterLocationId,
        activePlaythrough.customLocations || []
      );
    } catch (error) {
      console.error('Failed to validate custom location placement:', error);
      return false;
    }
  },

  // Get all available locations for placing custom locations after
  getAvailableAfterLocations: async () => {
    const activePlaythrough = playthroughActions.getActivePlaythrough();

    try {
      const { getAvailableAfterLocations } = await import(
        '@/loaders/locations'
      );
      return getAvailableAfterLocations(
        activePlaythrough?.customLocations || []
      );
    } catch (error) {
      console.error('Failed to get available after locations:', error);
      return [];
    }
  },

  // Get merged locations (default + custom) for the active playthrough
  getMergedLocations: async () => {
    const activePlaythrough = playthroughActions.getActivePlaythrough();

    try {
      const { getLocationsSortedWithCustom } = await import(
        '@/loaders/locations'
      );
      return getLocationsSortedWithCustom(
        activePlaythrough?.customLocations || []
      );
    } catch (error) {
      console.error('Failed to get merged locations:', error);
      return [];
    }
  },
};

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
      playthroughActions.getAllPlaythroughs().catch(error => {
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
  }, [playthroughId, playthroughData?.updatedAt]);
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
export const useEncounter = (locationId: string) => {
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
  }, [activePlaythrough?.customLocations, activePlaythrough?.updatedAt]);
};

export const useMergedLocations = () => {
  const activePlaythrough = useActivePlaythrough();

  return useMemo(() => {
    return playthroughActions.getMergedLocations();
  }, [activePlaythrough?.customLocations, activePlaythrough?.updatedAt]);
};

export const useAvailableAfterLocations = () => {
  const activePlaythrough = useActivePlaythrough();

  return useMemo(() => {
    return playthroughActions.getAvailableAfterLocations();
  }, [activePlaythrough?.customLocations, activePlaythrough?.updatedAt]);
};

// Hook for preferred variants - simplified version
export const usePreferredVariant = (
  headId?: number | null,
  bodyId?: number | null
) => {
  const setPreferredVariant = React.useCallback(
    async (variant?: string) => {
      await playthroughActions.setPreferredVariant(headId, bodyId, variant);
    },
    [headId, bodyId]
  );

  return {
    setPreferredVariant,
  };
};
