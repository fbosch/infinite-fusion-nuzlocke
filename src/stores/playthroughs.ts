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


// Debounced save mechanism using lodash
const debouncedSaveToIndexedDB = debounce(async (state: PlaythroughsState): Promise<void> => {
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
}, 500); // 500ms delay - adjust as needed

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

// Debounced save for individual playthroughs
const debouncedSavePlaythrough = debounce(async (playthrough: Playthrough): Promise<void> => {
  if (typeof window === 'undefined') return;

  try {
    const key = playthrough.id;
    
    // Convert proxy object to plain object for IndexedDB compatibility
    const plainPlaythrough = JSON.parse(JSON.stringify(playthrough));
    
    await set(key, plainPlaythrough);
    
    // Update the list of playthrough IDs
    const playthroughIds = (await get('playthrough_ids') || []) as string[];
    if (!playthroughIds.includes(playthrough.id)) {
      playthroughIds.push(playthrough.id);
      await set('playthrough_ids', playthroughIds);
    }
  } catch (error) {
    console.error(`Failed to save playthrough ${playthrough.id} to IndexedDB:`, error);
    console.error('Error details:', error);
  }
}, 500); // 500ms delay for playthrough saves

// Save individual playthrough to IndexedDB
const savePlaythroughToIndexedDB = async (playthrough: Playthrough): Promise<void> => {
  if (typeof window === 'undefined') return;

  try {
    const key = playthrough.id;
    
    // Convert proxy object to plain object for IndexedDB compatibility
    const plainPlaythrough = JSON.parse(JSON.stringify(playthrough));
    
    await set(key, plainPlaythrough);
    
    // Update the list of playthrough IDs
    const playthroughIds = (await get('playthrough_ids') || []) as string[];
    if (!playthroughIds.includes(playthrough.id)) {
      playthroughIds.push(playthrough.id);
      await set('playthrough_ids', playthroughIds);
    }
  } catch (error) {
    console.error(`Failed to save playthrough ${playthrough.id} to IndexedDB:`, error);
  }
};

// Delete individual playthrough from IndexedDB
const deletePlaythroughFromIndexedDB = async (playthroughId: string): Promise<void> => {
  if (typeof window === 'undefined') return;

  try {
    const key = playthroughId;
    await del(key);
    
    // Remove from the list of playthrough IDs
    const playthroughIds = (await get('playthrough_ids') || []) as string[];
    const updatedIds = playthroughIds.filter((id: string) => id !== playthroughId);
    await set('playthrough_ids', updatedIds);
  } catch (error) {
    console.error(`Failed to delete playthrough ${playthroughId} from IndexedDB:`, error);
  }
};

const loadFromIndexedDB = async (): Promise<PlaythroughsState> => {
  if (typeof window === 'undefined') return defaultState;

  try {
    // Load active playthrough ID
    const activePlaythroughId = await get(ACTIVE_PLAYTHROUGH_KEY);
    const playthroughs: Playthrough[] = [];

    // Try to load from the old format first (for migration)
   
      // Try to load individual playthroughs by checking for known keys
      const knownPlaythroughIds = (await get('playthrough_ids') || []) as string[];
      
      for (const playthroughId of knownPlaythroughIds) {
        try {
          const key = playthroughId;
          const playthroughData = await get(key);
          if (playthroughData) {
            const playthrough = PlaythroughSchema.parse(playthroughData);
            playthroughs.push(playthrough);
          } else {
          }
        } catch (error) {
          console.error(`Invalid playthrough data found for ID ${playthroughId}:`, error);
        }
      }

    // If no playthroughs exist, create a default one
    if (playthroughs.length === 0) {
      const defaultPlaythrough = createDefaultPlaythrough();
      playthroughs.push(defaultPlaythrough);

      const state: PlaythroughsState = {
        playthroughs,
        activePlaythroughId: defaultPlaythrough.id,
        isLoading: false,
      };

      return state;
    }

    // Return the state with loading complete
    return {
      playthroughs,
      activePlaythroughId: activePlaythroughId || undefined,
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
    window.requestIdleCallback(async () => {
      debouncedSaveToIndexedDB(playthroughsStore);
    const activePlaythrough = playthroughsStore.playthroughs.find(
      p => p.id === playthroughsStore.activePlaythroughId
    );
    if (activePlaythrough) {
        debouncedSavePlaythrough(activePlaythrough);
      }
    }, { timeout: 5000 });
  });
} else {
  // Server-side: Create a dummy store
  playthroughsStore = proxy<PlaythroughsState>(defaultState);
}

export { playthroughsStore };

// Playthrough actions
export const playthroughActions = {
  // Create a new playthrough
  createPlaythrough: async (name: string, remixMode: boolean = false): Promise<string> => {
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
  setActivePlaythrough: async (playthroughId: string) => {
    const playthrough = playthroughsStore.playthroughs.find(
      (p: Playthrough) => p.id === playthroughId
    );

    if (playthrough) {
      playthroughsStore.activePlaythroughId = playthroughId;
    }
  },

  // Toggle remix mode for active playthrough
  toggleRemixMode: async () => {
    const activePlaythrough = playthroughActions.getActivePlaythrough();
    if (activePlaythrough) {
      activePlaythrough.remixMode = !activePlaythrough.remixMode;
      activePlaythrough.updatedAt = getCurrentTimestamp();
    }
  },

  // Set remix mode for active playthrough
  setRemixMode: async (enabled: boolean) => {
    const activePlaythrough = playthroughActions.getActivePlaythrough();
    if (activePlaythrough) {
      activePlaythrough.remixMode = enabled;
      activePlaythrough.updatedAt = getCurrentTimestamp();
    }
  },

  // Update playthrough name
  updatePlaythroughName: async (playthroughId: string, name: string) => {
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
  resetAllPlaythroughs: async () => {
    // Delete all existing playthroughs from IndexedDB
    for (const playthrough of playthroughsStore.playthroughs) {
      await deletePlaythroughFromIndexedDB(playthrough.id);
    }

    // Create a new default playthrough instead of leaving empty
    const defaultPlaythrough = createDefaultPlaythrough();
    playthroughsStore.playthroughs = [defaultPlaythrough];
    playthroughsStore.activePlaythroughId = defaultPlaythrough.id;
  },

  // Encounter management actions

  // Get encounters for active playthrough
  getEncounters: (): Record<string, z.infer<typeof EncounterDataSchema>> => {
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
  },

  // Reset encounter for a location
  resetEncounter: async (locationId: string) => {
    const activePlaythrough = playthroughActions.getActivePlaythrough();
    if (!activePlaythrough) return;

    delete activePlaythrough.encounters[locationId];
    activePlaythrough.updatedAt = getCurrentTimestamp();
  },

  // Toggle fusion mode for an encounter
  toggleEncounterFusion: async (locationId: string) => {
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
  },

  // Create fusion from drag and drop
  createFusion: async (
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
    await saveToIndexedDB(playthroughsStore);
  },

  // Helper methods for drag and drop operations

  // Clear encounter from a specific location (replaces clearCombobox event)
  clearEncounterFromLocation: async (locationId: string, field?: 'head' | 'body') => {
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
  moveEncounter: async (
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
    await playthroughActions.updateEncounter(toLocationId, pokemon, toField, false);
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
  getLocationFromComboboxId: (comboboxId: string): { locationId: string; field: 'head' | 'body' } => {
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
