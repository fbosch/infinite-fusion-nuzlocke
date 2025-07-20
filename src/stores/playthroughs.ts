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
const PLAYTHROUGH_PREFIX = 'nuzlocke';

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

// Save individual playthrough to IndexedDB
const savePlaythroughToIndexedDB = async (playthrough: Playthrough): Promise<void> => {
  if (typeof window === 'undefined') {
    console.log('Skipping save - not in browser environment');
    return;
  }

  try {
    const key = playthrough.id;
    console.log('Saving playthrough to key:', key, playthrough.name);
    
    // Convert proxy object to plain object for IndexedDB compatibility
    const plainPlaythrough = JSON.parse(JSON.stringify(playthrough));
    console.log('Converted to plain object:', plainPlaythrough);
    
    await set(key, plainPlaythrough);
    console.log('Successfully saved playthrough to IndexedDB');
    
    // Update the list of playthrough IDs
    const playthroughIds = (await get('playthrough_ids') || []) as string[];
    if (!playthroughIds.includes(playthrough.id)) {
      playthroughIds.push(playthrough.id);
      await set('playthrough_ids', playthroughIds);
      console.log('Updated playthrough IDs list:', playthroughIds);
    }
  } catch (error) {
    console.error(`Failed to save playthrough ${playthrough.id} to IndexedDB:`, error);
    console.error('Error details:', error);
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
    console.warn(`Failed to delete playthrough ${playthroughId} from IndexedDB:`, error);
  }
};

const loadFromIndexedDB = async (): Promise<PlaythroughsState> => {
  if (typeof window === 'undefined') return defaultState;

  try {
    // Load active playthrough ID
    const activePlaythroughId = await get(ACTIVE_PLAYTHROUGH_KEY);
    const playthroughs: Playthrough[] = [];

    // Try to load from the old format first (for migration)
    const oldPlaythroughsData = await get('playthroughs');
    if (Array.isArray(oldPlaythroughsData)) {
      console.log('Migrating from old playthroughs format...');
      // Migrate from old format to new individual storage
      for (const item of oldPlaythroughsData) {
        try {
          const playthrough = PlaythroughSchema.parse(item);
          playthroughs.push(playthrough);
          // Save each playthrough individually with new prefix
          await savePlaythroughToIndexedDB(playthrough);
        } catch (error) {
          console.warn('Invalid playthrough data found:', error);
        }
      }
      // Remove the old format
      await del('playthroughs');
    } else {
      // Try to load individual playthroughs by checking for known keys
      const knownPlaythroughIds = (await get('playthrough_ids') || []) as string[];
      console.log('Loading playthroughs from IDs:', knownPlaythroughIds);
      
      for (const playthroughId of knownPlaythroughIds) {
        try {
          const key = playthroughId;
          console.log('Trying to load from key:', key);
          const playthroughData = await get(key);
          if (playthroughData) {
            const playthrough = PlaythroughSchema.parse(playthroughData);
            playthroughs.push(playthrough);
            console.log('Successfully loaded playthrough:', playthrough.name);
          } else {
            console.warn(`No data found for key: ${key}`);
          }
        } catch (error) {
          console.warn(`Invalid playthrough data found for ID ${playthroughId}:`, error);
        }
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

      // Save the default playthrough to IndexedDB immediately
      await savePlaythroughToIndexedDB(defaultPlaythrough);
      await saveToIndexedDB(state);

      return state;
    }

    const state: PlaythroughsState = {
      playthroughs,
      activePlaythroughId: activePlaythroughId || undefined,
      isLoading: false, // No longer loading if playthroughs exist
    };

    // Return the state with loading complete
    return state;
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
    // Ensure loading state is set to false
    playthroughsStore.isLoading = false;
  });

  // Note: Individual saves are now handled in each action
  // The subscription is removed since we save playthroughs individually
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

    // Save the new playthrough to IndexedDB immediately
    await savePlaythroughToIndexedDB(newPlaythrough);
    await saveToIndexedDB(playthroughsStore);

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
      // Save immediately for critical operations
      await saveToIndexedDB(playthroughsStore);
    }
  },

  // Toggle remix mode for active playthrough
  toggleRemixMode: async () => {
    const activePlaythrough = playthroughActions.getActivePlaythrough();
    if (activePlaythrough) {
      activePlaythrough.remixMode = !activePlaythrough.remixMode;
      activePlaythrough.updatedAt = getCurrentTimestamp();
      
      // Save the updated playthrough to IndexedDB
      await savePlaythroughToIndexedDB(activePlaythrough);
    }
  },

  // Set remix mode for active playthrough
  setRemixMode: async (enabled: boolean) => {
    const activePlaythrough = playthroughActions.getActivePlaythrough();
    if (activePlaythrough) {
      activePlaythrough.remixMode = enabled;
      activePlaythrough.updatedAt = getCurrentTimestamp();
      
      // Save the updated playthrough to IndexedDB
      await savePlaythroughToIndexedDB(activePlaythrough);
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
      
      // Save the updated playthrough to IndexedDB
      await savePlaythroughToIndexedDB(playthrough);
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

      // Delete from IndexedDB and save state immediately
      await deletePlaythroughFromIndexedDB(playthroughId);
      await saveToIndexedDB(playthroughsStore);
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

    // Save the new default playthrough to IndexedDB
    await savePlaythroughToIndexedDB(defaultPlaythrough);
    await saveToIndexedDB(playthroughsStore);
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
    console.log('updateEncounter called:', { locationId, pokemon, field, shouldCreateFusion });
    const activePlaythrough = playthroughActions.getActivePlaythrough();
    if (!activePlaythrough) {
      console.warn('No active playthrough found');
      return;
    }
    
    console.log('Active playthrough found:', activePlaythrough.name, activePlaythrough.id);
    console.log('Current encounters:', Object.keys(activePlaythrough.encounters));

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
    
    console.log('About to save updated playthrough:', activePlaythrough.name);
    console.log('Updated encounters:', Object.keys(activePlaythrough.encounters));
    console.log('Encounter data for this location:', activePlaythrough.encounters[locationId]);
    
    // Save the updated playthrough to IndexedDB
    await savePlaythroughToIndexedDB(activePlaythrough);
    console.log('Save completed for playthrough:', activePlaythrough.name);
  },

  // Reset encounter for a location
  resetEncounter: async (locationId: string) => {
    const activePlaythrough = playthroughActions.getActivePlaythrough();
    if (!activePlaythrough) return;

    delete activePlaythrough.encounters[locationId];
    activePlaythrough.updatedAt = getCurrentTimestamp();
    
    // Save the updated playthrough to IndexedDB
    await savePlaythroughToIndexedDB(activePlaythrough);
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
    
    // Save the updated playthrough to IndexedDB
    await savePlaythroughToIndexedDB(activePlaythrough);
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
    
    // Save the updated playthrough to IndexedDB
    await savePlaythroughToIndexedDB(activePlaythrough);
  },

  // Force immediate save (for critical operations)
  forceSave: async () => {
    if (typeof window === 'undefined') return;
    await saveToIndexedDB(playthroughsStore);
  },
};
