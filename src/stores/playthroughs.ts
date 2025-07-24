import { proxy, subscribe, useSnapshot } from 'valtio';
import { devtools } from 'valtio/utils';
import { z, ZodError } from 'zod';
import { get, set, del } from 'idb-keyval';
import { debounce } from 'lodash';
import React, { useMemo } from 'react';
import { PokemonOptionSchema, generatePokemonUID } from '@/loaders/pokemon';
import { CustomLocationSchema } from '@/loaders/locations';

export const EncounterDataSchema = z.object({
  head: PokemonOptionSchema.nullable(),
  body: PokemonOptionSchema.nullable(),
  isFusion: z.boolean(),
  artworkVariant: z.string().optional(),
});

// Zod schema for a single playthrough
export const PlaythroughSchema = z.object({
  id: z.string(),
  name: z.string(),
  customLocations: z.array(CustomLocationSchema).optional(),
  encounters: z.record(z.string(), EncounterDataSchema).optional(),
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
      playthroughsStore.isSaving = true;

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
    } finally {
      playthroughsStore.isSaving = false;
    }
  },
  500,
  { leading: true }
);

// Immediate save function for critical operations
const saveToIndexedDB = async (state: PlaythroughsState): Promise<void> => {
  if (typeof window === 'undefined') return;

  try {
    playthroughsStore.isSaving = true;

    // Save active playthrough ID
    if (state.activePlaythroughId) {
      await set(ACTIVE_PLAYTHROUGH_KEY, state.activePlaythroughId);
    } else {
      await del(ACTIVE_PLAYTHROUGH_KEY);
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
  } finally {
    playthroughsStore.isSaving = false;
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
      // Force cache invalidation immediately when switching playthroughs
      invalidateActivePlaythroughCache();
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

    // Ensure encounters object exists
    if (!activePlaythrough.encounters) {
      activePlaythrough.encounters = {};
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

    // Set originalLocation and UID if pokemon is provided and doesn't already have them
    const pokemonWithLocationAndUID = pokemon
      ? {
          ...pokemon,
          originalLocation: pokemon.originalLocation || locationId,
          uid: pokemon.uid || generatePokemonUID(),
        }
      : pokemon;

    if (shouldCreateFusion || encounter.isFusion) {
      // Check if this is changing the fusion composition
      const wasComplete = encounter.head && encounter.body;
      const oldPokemon = encounter[field];
      const isChangingComposition =
        !oldPokemon || oldPokemon.id !== pokemonWithLocationAndUID?.id;

      // For fusion encounters, update the specified field and ensure isFusion is true
      encounter[field] = pokemonWithLocationAndUID;
      encounter.isFusion = true;

      // Reset artwork variant if the fusion composition is changing
      if (isChangingComposition) {
        encounter.artworkVariant = undefined;
      }

      // Default behavior: If setting status on one part of a fusion and the other part
      // doesn't have a status, set both to the same status
      if (
        pokemonWithLocationAndUID?.status &&
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
      // For regular encounters, set head and ensure isFusion is false
      encounter.head = pokemonWithLocationAndUID;
      encounter.body = null;
      encounter.isFusion = false;
      encounter.artworkVariant = undefined; // Reset artwork variant for non-fusion
    }

    activePlaythrough.updatedAt = getCurrentTimestamp();
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
    activePlaythrough.updatedAt = getCurrentTimestamp();
  },

  // Toggle fusion mode for an encounter
  toggleEncounterFusion: (locationId: string) => {
    const activePlaythrough = playthroughActions.getActivePlaythrough();
    if (!activePlaythrough) return;

    // Ensure encounters object exists
    if (!activePlaythrough.encounters) {
      activePlaythrough.encounters = {};
    }

    const currentEncounter = activePlaythrough.encounters[locationId] || {
      head: null,
      body: null,
      isFusion: false,
    };

    const newIsFusion = !currentEncounter.isFusion;

    // When unfusing (going from fusion to non-fusion)
    if (currentEncounter.isFusion && !newIsFusion) {
      // If head is empty but body has data, move body to head
      if (!currentEncounter.head && currentEncounter.body) {
        activePlaythrough.encounters![locationId] = {
          head: currentEncounter.body,
          body: null,
          isFusion: false,
          artworkVariant: undefined, // Reset artwork variant when unfusing
        };
      } else {
        // If both slots have data or only head has data, preserve as-is
        activePlaythrough.encounters![locationId] = {
          ...currentEncounter,
          isFusion: false,
          artworkVariant: undefined, // Reset artwork variant when unfusing
        };
      }
    } else {
      // When fusing (going from non-fusion to fusion) or other cases
      activePlaythrough.encounters![locationId] = {
        ...currentEncounter,
        isFusion: newIsFusion,
        artworkVariant: undefined, // Reset artwork variant when changing fusion state
      };
    }

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

    // Ensure encounters object exists
    if (!activePlaythrough.encounters) {
      activePlaythrough.encounters = {};
    }

    activePlaythrough.encounters[locationId] = {
      head,
      body,
      isFusion: true,
      artworkVariant: undefined, // Reset artwork variant for new fusion
    };

    activePlaythrough.updatedAt = getCurrentTimestamp();
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

    encounter.artworkVariant = variant;
    activePlaythrough.updatedAt = getCurrentTimestamp();
  },

  // Cycle through artwork variants for encounters (with validation)
  cycleArtworkVariant: async (locationId: string, reverse: boolean = false) => {
    const activePlaythrough = playthroughActions.getActivePlaythrough();
    if (!activePlaythrough) return;

    // Ensure encounters object exists
    if (!activePlaythrough.encounters) {
      activePlaythrough.encounters = {};
    }

    const encounter = activePlaythrough.encounters[locationId];
    if (!encounter) return;

    // Check if it's a fusion or single Pokémon
    const isFusion = encounter.isFusion && encounter.head && encounter.body;
    const isSinglePokemon = !encounter.isFusion && encounter.head;

    if (!isFusion && !isSinglePokemon) return;

    try {
      // Import the validation utilities dynamically
      const {
        getAvailableArtworkVariants,
        getCachedArtworkVariants,
        getAvailablePokemonArtworkVariants,
        getCachedPokemonArtworkVariants,
      } = await import('@/utils/spriteService');

      let availableVariants: string[] | null = null;

      if (isFusion && encounter.head && encounter.body) {
        // Handle fusion variants
        // First try to get cached variants to avoid unnecessary HTTP requests
        availableVariants = getCachedArtworkVariants(
          encounter.head.id,
          encounter.body.id
        );

        // If not cached, fetch them (this will use sequential checking)
        if (!availableVariants) {
          console.log(
            `Checking variants for fusion ${encounter.head.id}.${encounter.body.id}...`
          );
          availableVariants = await getAvailableArtworkVariants(
            encounter.head.id,
            encounter.body.id
          );
        }
      } else if (isSinglePokemon && encounter.head) {
        // Handle single Pokémon variants
        // First try to get cached variants to avoid unnecessary HTTP requests
        availableVariants = getCachedPokemonArtworkVariants(encounter.head.id);

        // If not cached, fetch them (this will use sequential checking)
        if (!availableVariants) {
          console.log(`Checking variants for Pokémon ${encounter.head.id}...`);
          availableVariants = await getAvailablePokemonArtworkVariants(
            encounter.head.id
          );
        }
      }

      if (!availableVariants) return;

      // If no variants available (only default), don't cycle
      if (availableVariants.length <= 1) {
        const entityDesc = isFusion
          ? `fusion ${encounter.head!.id}.${encounter.body!.id}`
          : `Pokémon ${encounter.head!.id}`;
        console.log(
          `No alternative artwork variants found for ${entityDesc} (only default available)`
        );
        return;
      }

      const currentVariant = encounter.artworkVariant || '';
      const currentIndex = availableVariants.indexOf(currentVariant);

      // Calculate next index based on direction
      const nextIndex = reverse
        ? (currentIndex - 1 + availableVariants.length) %
          availableVariants.length
        : (currentIndex + 1) % availableVariants.length;

      const nextVariant = availableVariants[nextIndex];
      encounter.artworkVariant = nextVariant || undefined;
      activePlaythrough.updatedAt = getCurrentTimestamp();

      const entityDesc = isFusion
        ? `fusion ${encounter.head!.id}.${encounter.body!.id}`
        : `Pokémon ${encounter.head!.id}`;
      console.log(
        `Switched to artwork variant: ${nextVariant || 'default'} for ${entityDesc} (${reverse ? 'reverse' : 'forward'})`
      );
    } catch (error) {
      console.error('Failed to cycle artwork variant:', error);
      // Fall back to default on error
      encounter.artworkVariant = undefined;
      activePlaythrough.updatedAt = getCurrentTimestamp();
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

    // Get all fusion encounters
    const fusionEncounters = Object.entries(activePlaythrough.encounters)
      .filter(
        ([, encounter]) =>
          encounter.isFusion && encounter.head && encounter.body
      )
      .map(([, encounter]) => ({
        headId: encounter.head!.id,
        bodyId: encounter.body!.id,
      }));

    // Get all single Pokémon encounters
    const pokemonEncounters = Object.entries(activePlaythrough.encounters)
      .filter(([, encounter]) => !encounter.isFusion && encounter.head)
      .map(([, encounter]) => ({
        pokemonId: encounter.head!.id,
      }));

    if (fusionEncounters.length === 0 && pokemonEncounters.length === 0) {
      console.log('No encounters found to preload variants for');
      return;
    }

    console.log(
      `Preloading artwork variants for ${fusionEncounters.length} fusion encounters and ${pokemonEncounters.length} Pokémon encounters...`
    );

    try {
      // Import the validation utilities dynamically
      const { preloadArtworkVariants, getAvailablePokemonArtworkVariants } =
        await import('@/utils/spriteService');

      const preloadPromises: Promise<void>[] = [];

      // Preload variants for all fusions (limited concurrency)
      if (fusionEncounters.length > 0) {
        preloadPromises.push(preloadArtworkVariants(fusionEncounters, 2));
      }

      // Preload variants for single Pokémon (limited concurrency)
      if (pokemonEncounters.length > 0) {
        for (let i = 0; i < pokemonEncounters.length; i += 2) {
          const batch = pokemonEncounters.slice(i, i + 2);

          const batchPromises = batch.map(({ pokemonId }) =>
            getAvailablePokemonArtworkVariants(pokemonId).catch(error => {
              console.warn(
                `Failed to preload variants for Pokémon ${pokemonId}:`,
                error
              );
            })
          );

          preloadPromises.push(Promise.all(batchPromises).then(() => {}));

          // Add a small delay between batches to be respectful to the server
          if (i + 2 < pokemonEncounters.length) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }
      }

      await Promise.all(preloadPromises);
      console.log('Artwork variant preloading completed');
    } catch (error) {
      console.error('Failed to preload artwork variants:', error);
    }
  },

  // Helper methods for drag and drop operations

  // Clear encounter from a specific location (replaces clearCombobox event)
  clearEncounterFromLocation: (locationId: string, field?: 'head' | 'body') => {
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
    } else {
      // Clear only the specified field
      encounter[field] = null;

      // Reset artwork variant when clearing part of a fusion
      if (encounter.isFusion) {
        encounter.artworkVariant = undefined;
      }

      // Only remove the entire encounter if it's not a fusion and we're clearing the head
      // OR if it's a regular encounter (not a fusion) and both are null
      if (!encounter.isFusion) {
        if (field === 'head' || (!encounter.head && !encounter.body)) {
          delete activePlaythrough.encounters![locationId];
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

    // Ensure encounters object exists
    if (!activePlaythrough.encounters) {
      activePlaythrough.encounters = {};
    }

    // Clear the source location
    delete activePlaythrough.encounters[fromLocationId];

    // Set the destination and reset artwork variant since it's a new fusion context
    playthroughActions.updateEncounter(toLocationId, pokemon, toField, false);

    // Reset artwork variant for the destination encounter
    const destEncounter = activePlaythrough.encounters[toLocationId];
    if (destEncounter) {
      destEncounter.artworkVariant = undefined;
    }
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

    // Reset artwork variants since the fusion combinations have changed
    encounter1.artworkVariant = undefined;
    encounter2.artworkVariant = undefined;

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

      activePlaythrough.customLocations.push(newCustomLocation);
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
      // Remove the custom location
      activePlaythrough.customLocations.splice(index, 1);

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
  const activePlaythroughData = snapshot.playthroughs.find(
    p => p.id === snapshot.activePlaythroughId
  );

  return useMemo(() => {
    return playthroughActions.getActivePlaythrough();
  }, [snapshot.activePlaythroughId, activePlaythroughData?.updatedAt]);
};

export const useIsRemixMode = (): boolean => {
  const snapshot = useSnapshot(playthroughsStore);
  const activePlaythroughData = snapshot.playthroughs.find(
    p => p.id === snapshot.activePlaythroughId
  );

  return useMemo(() => {
    return playthroughActions.isRemixModeEnabled();
  }, [
    snapshot.activePlaythroughId,
    activePlaythroughData?.remixMode,
    activePlaythroughData?.updatedAt,
  ]);
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
  const activePlaythrough = useActivePlaythrough();

  return useMemo(() => {
    return activePlaythrough?.encounters || {};
  }, [activePlaythrough?.encounters, activePlaythrough?.updatedAt]);
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
