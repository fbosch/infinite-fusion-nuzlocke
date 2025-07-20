import { proxy, subscribe } from 'valtio';
import { z } from 'zod';
import { get, set, del } from 'idb-keyval';
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
  encounters: z.record(z.string(), EncounterDataSchema),
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
export type PlaythroughsState = z.infer<typeof PlaythroughsSchema>;

// Default state
const defaultState: PlaythroughsState = {
  playthroughs: [],
  activePlaythroughId: undefined,
};

// Storage keys
const PLAYTHROUGHS_KEY = 'playthroughs';
const ACTIVE_PLAYTHROUGH_KEY = 'activePlaythroughId';

// Helper functions
const generatePlaythroughId = (): string => {
  return `playthrough_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const getCurrentTimestamp = (): number => {
  return Date.now();
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

// Debounced save mechanism
let saveTimeout: number | null = null;
let savingInProgress: number | null = null;

const debouncedSaveToIndexedDB = async (state: PlaythroughsState): Promise<void> => {
  if (typeof window === 'undefined') return;

  // Clear any existing timeout
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  // Set a new timeout to delay the save
  saveTimeout = window.setTimeout(async () => {
    // Cancel any previous idle callback
    if (savingInProgress) {
      window.cancelIdleCallback(savingInProgress);
    }

    try {
      savingInProgress = requestIdleCallback(async () => {
        try {
          // Save playthroughs array
          await set(PLAYTHROUGHS_KEY, state.playthroughs);

          // Save active playthrough ID
          if (state.activePlaythroughId) {
            await set(ACTIVE_PLAYTHROUGH_KEY, state.activePlaythroughId);
          } else {
            await del(ACTIVE_PLAYTHROUGH_KEY);
          }

          // Clear the timeout and idle callback references
          saveTimeout = null;
          savingInProgress = null;
        } catch (error) {
          console.warn('Failed to save playthroughs to IndexedDB:', error);
        }
      });
    } catch (error) {
      console.warn('Failed to save playthroughs to IndexedDB:', error);
    }
  }, 500); // 500ms delay - adjust as needed
};

// Immediate save function for critical operations
const saveToIndexedDB = async (state: PlaythroughsState): Promise<void> => {
  if (typeof window === 'undefined') return;

  try {
    // Save playthroughs array
    await set(PLAYTHROUGHS_KEY, state.playthroughs);

    // Save active playthrough ID
    if (state.activePlaythroughId) {
      await set(ACTIVE_PLAYTHROUGH_KEY, state.activePlaythroughId);
    } else {
      await del(ACTIVE_PLAYTHROUGH_KEY);
    }
  } catch (error) {
    console.warn('Failed to save playthroughs to IndexedDB:', error);
  }
};

const loadFromIndexedDB = async (): Promise<PlaythroughsState> => {
  if (typeof window === 'undefined') return defaultState;

  try {
    // Load playthroughs array
    const playthroughsData = await get(PLAYTHROUGHS_KEY);
    const playthroughs: Playthrough[] = [];

    if (Array.isArray(playthroughsData)) {
      for (const item of playthroughsData) {
        try {
          const playthrough = PlaythroughSchema.parse(item);
          playthroughs.push(playthrough);
        } catch (error) {
          console.warn('Invalid playthrough data found:', error);
        }
      }
    }

    // Load active playthrough ID
    const activePlaythroughId = await get(ACTIVE_PLAYTHROUGH_KEY);

    // If no playthroughs exist, create a default one
    if (playthroughs.length === 0) {
      const defaultPlaythrough = createDefaultPlaythrough();
      playthroughs.push(defaultPlaythrough);

      const state: PlaythroughsState = {
        playthroughs,
        activePlaythroughId: defaultPlaythrough.id,
      };

      // Save the default playthrough to IndexedDB immediately
      await saveToIndexedDB(state);

      const validatedState = PlaythroughsSchema.parse(state);
      return validatedState;
    }

    const state: PlaythroughsState = {
      playthroughs,
      activePlaythroughId: activePlaythroughId || undefined,
    };

    // Validate the entire state
    const validatedState = PlaythroughsSchema.parse(state);
    return validatedState;
  } catch (error) {
    console.warn('Failed to load playthroughs from IndexedDB:', error);
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
  });

  // Subscribe to changes and use debounced save for most updates
  subscribe(playthroughsStore, () => {
    debouncedSaveToIndexedDB(playthroughsStore);
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
    if (typeof window === 'undefined') return '';

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

    // Save immediately for critical operations
    saveToIndexedDB(playthroughsStore);

    return newPlaythrough.id;
  },

  // Get active playthrough
  getActivePlaythrough: (): Playthrough | null => {
    if (!playthroughsStore.activePlaythroughId) return null;

    return (
      playthroughsStore.playthroughs.find(
        (p: Playthrough) => p.id === playthroughsStore.activePlaythroughId
      ) || null
    );
  },

  // Set active playthrough
  setActivePlaythrough: (playthroughId: string) => {
    if (typeof window === 'undefined') return;

    const playthrough = playthroughsStore.playthroughs.find(
      (p: Playthrough) => p.id === playthroughId
    );

    if (playthrough) {
      playthroughsStore.activePlaythroughId = playthroughId;
      // Save immediately for critical operations
      saveToIndexedDB(playthroughsStore);
    }
  },

  // Toggle remix mode for active playthrough
  toggleRemixMode: () => {
    if (typeof window === 'undefined') return;

    const activePlaythrough = playthroughActions.getActivePlaythrough();
    if (activePlaythrough) {
      activePlaythrough.remixMode = !activePlaythrough.remixMode;
      activePlaythrough.updatedAt = getCurrentTimestamp();
    }
  },

  // Set remix mode for active playthrough
  setRemixMode: (enabled: boolean) => {
    if (typeof window === 'undefined') return;

    const activePlaythrough = playthroughActions.getActivePlaythrough();
    if (activePlaythrough) {
      activePlaythrough.remixMode = enabled;
      activePlaythrough.updatedAt = getCurrentTimestamp();
    }
  },

  // Update playthrough name
  updatePlaythroughName: (playthroughId: string, name: string) => {
    if (typeof window === 'undefined') return;

    const playthrough = playthroughsStore.playthroughs.find(
      (p: Playthrough) => p.id === playthroughId
    );

    if (playthrough) {
      playthrough.name = name;
      playthrough.updatedAt = getCurrentTimestamp();
    }
  },

  // Delete playthrough
  deletePlaythrough: (playthroughId: string) => {
    if (typeof window === 'undefined') return;

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

      // Save immediately for critical operations
      saveToIndexedDB(playthroughsStore);
    }
  },

  // Get all playthroughs
  getAllPlaythroughs: (): Playthrough[] => {
    return [...playthroughsStore.playthroughs];
  },

  // Check if active playthrough has remix mode enabled
  isRemixModeEnabled: (): boolean => {
    const activePlaythrough = playthroughActions.getActivePlaythrough();
    return activePlaythrough?.remixMode || false;
  },

  // Reset all playthroughs
  resetAllPlaythroughs: () => {
    if (typeof window === 'undefined') return;

    // Create a new default playthrough instead of leaving empty
    const defaultPlaythrough = createDefaultPlaythrough();
    playthroughsStore.playthroughs = [defaultPlaythrough];
    playthroughsStore.activePlaythroughId = defaultPlaythrough.id;

    // Save immediately for critical operations
    saveToIndexedDB(playthroughsStore);
  },

  // Encounter management actions

  // Get encounters for active playthrough
  getEncounters: (): Record<string, z.infer<typeof EncounterDataSchema>> => {
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
    if (typeof window === 'undefined') return;

    const activePlaythrough = playthroughActions.getActivePlaythrough();
    if (!activePlaythrough) return;

    // Set originalLocation if pokemon is provided and doesn't already have one
    const pokemonWithLocation = pokemon
      ? {
          ...pokemon,
          originalLocation: pokemon.originalLocation || locationId,
        }
      : pokemon;

    const currentEncounter = activePlaythrough.encounters[locationId] || {
      head: null,
      body: null,
      isFusion: false,
    };

    if (shouldCreateFusion) {
      // Creating a new fusion
      activePlaythrough.encounters[locationId] = {
        head: field === 'head' ? pokemonWithLocation : currentEncounter.head,
        body: field === 'body' ? pokemonWithLocation : currentEncounter.body,
        isFusion: true,
      };
    } else if (currentEncounter.isFusion) {
      // For existing fusions, update the specified field
      activePlaythrough.encounters[locationId] = {
        head: field === 'head' ? pokemonWithLocation : currentEncounter.head,
        body: field === 'body' ? pokemonWithLocation : currentEncounter.body,
        isFusion: true,
      };
    } else {
      // For regular encounters, just set the head
      activePlaythrough.encounters[locationId] = {
        head: pokemonWithLocation,
        body: null,
        isFusion: false,
      };
    }

    activePlaythrough.updatedAt = getCurrentTimestamp();
    // Note: Save is automatically debounced via the store subscription
  },

  // Reset encounter for a location
  resetEncounter: (locationId: string) => {
    if (typeof window === 'undefined') return;

    const activePlaythrough = playthroughActions.getActivePlaythrough();
    if (!activePlaythrough) return;

    delete activePlaythrough.encounters[locationId];
    activePlaythrough.updatedAt = getCurrentTimestamp();
    // Note: Save is automatically debounced via the store subscription
  },

  // Toggle fusion mode for an encounter
  toggleEncounterFusion: (locationId: string) => {
    if (typeof window === 'undefined') return;

    const activePlaythrough = playthroughActions.getActivePlaythrough();
    if (!activePlaythrough) return;

    const currentEncounter = activePlaythrough.encounters[locationId] || {
      head: null,
      body: null,
      isFusion: false,
    };

    const newIsFusion = !currentEncounter.isFusion;

    if (newIsFusion) {
      // Converting to fusion - existing Pokemon becomes the head (fusion base)
      activePlaythrough.encounters[locationId] = {
        ...currentEncounter,
        isFusion: true,
      };
    } else {
      // When unfusing, preserve all properties of the Pokémon that becomes the single encounter
      const singlePokemon = currentEncounter.head || currentEncounter.body;
      activePlaythrough.encounters[locationId] = {
        head: singlePokemon,
        body: null,
        isFusion: false,
      };
    }

    activePlaythrough.updatedAt = getCurrentTimestamp();
    // Note: Save is automatically debounced via the store subscription
  },

  // Create fusion from drag and drop
  createFusion: (
    locationId: string,
    head: z.infer<typeof PokemonOptionSchema>,
    body: z.infer<typeof PokemonOptionSchema>
  ) => {
    if (typeof window === 'undefined') return;

    const activePlaythrough = playthroughActions.getActivePlaythrough();
    if (!activePlaythrough) return;

    activePlaythrough.encounters[locationId] = {
      head,
      body,
      isFusion: true,
    };

    activePlaythrough.updatedAt = getCurrentTimestamp();
    // Note: Save is automatically debounced via the store subscription
  },

  // Force immediate save (for critical operations)
  forceSave: async () => {
    if (typeof window === 'undefined') return;
    await saveToIndexedDB(playthroughsStore);
  },
};
