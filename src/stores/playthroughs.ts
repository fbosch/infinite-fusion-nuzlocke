import { proxy, subscribe } from 'valtio';
import { z } from 'zod';
import { get, set, del } from 'idb-keyval';
import { PokemonOptionSchema } from '../loaders/pokemon';

export const EncounterDataSchema = z.object({
  head: PokemonOptionSchema,
  body: PokemonOptionSchema,
  isFusion: z.boolean(),
});

// Zod schema for a single playthrough
export const PlaythroughSchema = z.object({
  id: z.string(),
  name: z.string(),
  encounters: z.array(EncounterDataSchema),
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
  encounters: [],
  remixMode: false,
  createdAt: getCurrentTimestamp(),
  updatedAt: getCurrentTimestamp(),
});

// IndexedDB helper functions using idb-keyval
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

      // Save the default playthrough to IndexedDB
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

  // Subscribe to changes and save to IndexedDB
  subscribe(playthroughsStore, () => {
    saveToIndexedDB(playthroughsStore);
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
      encounters: [],
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
  setActivePlaythrough: (playthroughId: string) => {
    if (typeof window === 'undefined') return;

    const playthrough = playthroughsStore.playthroughs.find(
      (p: Playthrough) => p.id === playthroughId
    );

    if (playthrough) {
      playthroughsStore.activePlaythroughId = playthroughId;
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
  },
};
