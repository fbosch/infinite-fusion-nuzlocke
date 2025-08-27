import { proxy, subscribe } from 'valtio';
import { devtools } from 'valtio/utils';
import { PlaythroughsState, Playthrough, GameMode } from './types';
import {
  loadFromIndexedDB,
  createDebouncedSaveAll,
  loadPlaythroughById,
  deletePlaythroughFromIndexedDB,
  loadAllPlaythroughs,
  saveToIndexedDB,
} from './persistence';
import { z } from 'zod';
import { generatePrefixedId } from '@/utils/id';

// Default state
const defaultState: PlaythroughsState = {
  playthroughs: [],
  activePlaythroughId: undefined,
  isLoading: true, // Start in loading state
  isSaving: false,
};

// Simple cache for active playthrough to avoid repeated find() calls
let cachedActivePlaythrough: Playthrough | null = null;
let cachedActiveId: string | undefined = undefined;

// Helper functions
const generatePlaythroughId = (): string => {
  return generatePrefixedId('playthrough');
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
  team: { members: Array.from({ length: 6 }, () => null) }, // Fixed size 6 with null values
  gameMode: 'classic',
  version: '1.0.0',
  createdAt: getCurrentTimestamp(),
  updatedAt: getCurrentTimestamp(),
});

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
  loadFromIndexedDB(playthroughsStore).then(() => {
    // Ensure loading state is set to false
    playthroughsStore.isLoading = false;
  });

  // Create debounced save function with store dependencies
  const debouncedSaveAll = createDebouncedSaveAll(playthroughsStore, () =>
    getActivePlaythrough()
  );

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

// Core actions
const getActivePlaythrough = (): Playthrough | null => {
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
};

const createPlaythrough = (
  name: string,
  gameMode: GameMode = 'classic'
): string => {
  const newPlaythrough: Playthrough = {
    id: generatePlaythroughId(),
    name,
    encounters: {},
    team: { members: Array.from({ length: 6 }, () => null) },
    gameMode,
    version: '1.0.0',
    createdAt: getCurrentTimestamp(),
    updatedAt: getCurrentTimestamp(),
  };

  playthroughsStore.playthroughs.push(newPlaythrough);

  // Set as active if it's the first playthrough
  if (playthroughsStore.playthroughs.length === 1) {
    playthroughsStore.activePlaythroughId = newPlaythrough.id;
  }

  return newPlaythrough.id;
};

const setActivePlaythrough = async (playthroughId: string) => {
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
};

const cycleGameMode = () => {
  const activePlaythrough = getActivePlaythrough();
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
};

const toggleRemixMode = () => {
  const activePlaythrough = getActivePlaythrough();
  if (activePlaythrough) {
    // Convert current mode to boolean logic for backward compatibility
    const isRemix = activePlaythrough.gameMode === 'remix';
    activePlaythrough.gameMode = isRemix ? 'classic' : 'remix';
    // Don't update timestamp immediately for UI toggles - let the debounced save handle it
  }
};

const setGameMode = (gameMode: GameMode) => {
  const activePlaythrough = getActivePlaythrough();
  if (activePlaythrough) {
    activePlaythrough.gameMode = gameMode;
    activePlaythrough.updatedAt = getCurrentTimestamp();
  }
};

const setRemixMode = (enabled: boolean) => {
  const activePlaythrough = getActivePlaythrough();
  if (activePlaythrough) {
    activePlaythrough.gameMode = enabled ? 'remix' : 'classic';
    activePlaythrough.updatedAt = getCurrentTimestamp();
  }
};

const updatePlaythroughName = (playthroughId: string, name: string) => {
  const playthrough = playthroughsStore.playthroughs.find(
    (p: Playthrough) => p.id === playthroughId
  );

  if (playthrough) {
    playthrough.name = name;
    playthrough.updatedAt = getCurrentTimestamp();
  }
};

const deletePlaythrough = async (playthroughId: string) => {
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
};

const getAllPlaythroughs = async (): Promise<Playthrough[]> => {
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
};

const getCurrentlyLoadedPlaythroughs = (): Playthrough[] => {
  return [...playthroughsStore.playthroughs];
};

const isRemixModeEnabled = (): boolean => {
  const activePlaythrough = getActivePlaythrough();
  return activePlaythrough?.gameMode === 'remix';
};

const getGameMode = (): GameMode => {
  const activePlaythrough = getActivePlaythrough();
  return (activePlaythrough?.gameMode as GameMode) || 'classic';
};

const importPlaythrough = async (importData: unknown): Promise<string> => {
  try {
    // Validate the imported data against the schema
    const { ImportedPlaythroughSchema } = await import('./types');
    const validatedData = ImportedPlaythroughSchema.parse(importData);

    // Extract the playthrough data - the transform ensures proper typing
    const importedPlaythrough = validatedData.playthrough;

    // Check for ID conflicts and generate new ID if needed
    const existingIds = new Set(playthroughsStore.playthroughs.map(p => p.id));
    let finalId = importedPlaythrough.id;

    if (existingIds.has(finalId)) {
      // Generate a new unique ID with timestamp and crypto-secure random suffix
      finalId = generatePrefixedId('playthrough');
    }

    // Create the new playthrough with migrated data
    const newPlaythrough: Playthrough = {
      id: finalId,
      name: importedPlaythrough.name,
      gameMode: importedPlaythrough.gameMode as GameMode, // Type assertion since transform ensures it's GameMode
      version: importedPlaythrough.version || '1.0.0',
      createdAt: importedPlaythrough.createdAt,
      updatedAt: Date.now(), // Update to current time
      customLocations: importedPlaythrough.customLocations || [],
      encounters: importedPlaythrough.encounters || {},
      team: importedPlaythrough.team || {
        members: [null, null, null, null, null, null],
      }, // Fixed size 6 with null values
    };

    // Add to store
    playthroughsStore.playthroughs.push(newPlaythrough);

    // Set as active playthrough
    playthroughsStore.activePlaythroughId = finalId;

    return finalId;
  } catch (error) {
    console.error('Failed to import playthrough:', error);

    // Handle Zod validation errors specifically
    if (error && typeof error === 'object' && 'issues' in error) {
      try {
        const prettyError = z.prettifyError(error as z.ZodError);
        throw new Error(`Validation failed:\n\n${prettyError}`);
      } catch {
        const zodError = error as z.ZodError;
        if (zodError.issues && zodError.issues.length > 0) {
          const errorDetails = zodError.issues
            .map((issue: z.ZodIssue) => {
              const path =
                issue.path.length > 0 ? ` at ${issue.path.join('.')}` : '';
              return `• ${issue.message}${path}`;
            })
            .join('\n');
          throw new Error(`Validation failed:\n\n${errorDetails}`);
        }
        throw new Error('Data validation failed');
      }
    }

    throw new Error('Invalid playthrough data format');
  }
};

const isRandomizedModeEnabled = (): boolean => {
  const activePlaythrough = getActivePlaythrough();
  return activePlaythrough?.gameMode === 'randomized';
};

const resetAllPlaythroughs = async () => {
  // Delete all existing playthroughs from IndexedDB in parallel
  const deletePromises = playthroughsStore.playthroughs.map(playthrough =>
    deletePlaythroughFromIndexedDB(playthrough.id)
  );
  await Promise.all(deletePromises);

  // Create a new default playthrough instead of leaving empty
  const defaultPlaythrough = createDefaultPlaythrough();
  playthroughsStore.playthroughs = [defaultPlaythrough];
  playthroughsStore.activePlaythroughId = defaultPlaythrough.id;
};

const forceSave = async () => {
  if (typeof window === 'undefined') return;
  await saveToIndexedDB(playthroughsStore);
};

// Team management actions
const addToTeam = (locationId: string, position: number): boolean => {
  const activePlaythrough = getActivePlaythrough();
  if (!activePlaythrough) return false;

  // Validate position
  if (position < 0 || position >= 6) return false;

  // Check if position is already occupied
  if (activePlaythrough.team.members[position] !== null) return false;

  // Validate that encounter exists at the location
  const encounter = activePlaythrough.encounters?.[locationId];
  if (!encounter || !encounter.head || !encounter.body) {
    return false;
  }

  // Check if this encounter is already used in other team slots
  const isAlreadyInTeam = activePlaythrough.team.members.some(
    member => member && member.headEncounterId === locationId
  );

  if (isAlreadyInTeam) return false;

  // Add to team - reference the location as the encounter ID
  activePlaythrough.team.members[position] = {
    headEncounterId: locationId,
    bodyEncounterId: locationId,
  };

  activePlaythrough.updatedAt = getCurrentTimestamp();
  return true;
};

const removeFromTeam = (position: number): boolean => {
  const activePlaythrough = getActivePlaythrough();
  if (!activePlaythrough) return false;

  // Validate position
  if (position < 0 || position >= 6) return false;

  // Check if position is occupied
  if (activePlaythrough.team.members[position] === null) return false;

  // Remove from team
  activePlaythrough.team.members[position] = null;

  activePlaythrough.updatedAt = getCurrentTimestamp();
  return true;
};

const reorderTeam = (fromPosition: number, toPosition: number): boolean => {
  const activePlaythrough = getActivePlaythrough();
  if (!activePlaythrough) return false;

  // Validate positions
  if (
    fromPosition < 0 ||
    fromPosition >= 6 ||
    toPosition < 0 ||
    toPosition >= 6
  ) {
    return false;
  }

  // Check if source position is occupied
  if (activePlaythrough.team.members[fromPosition] === null) return false;

  // If moving to the same position, no change needed
  if (fromPosition === toPosition) return true;

  // Get the team member to move
  const teamMember = activePlaythrough.team.members[fromPosition];

  // Remove from source position
  activePlaythrough.team.members[fromPosition] = null;

  // Add to target position (overwrite if occupied)
  activePlaythrough.team.members[toPosition] = teamMember;

  activePlaythrough.updatedAt = getCurrentTimestamp();
  return true;
};

// Helper function to get team member details
const getTeamMemberDetails = (position: number) => {
  const activePlaythrough = getActivePlaythrough();
  if (!activePlaythrough || position < 0 || position >= 6) return null;

  const teamMember = activePlaythrough.team.members[position];
  if (!teamMember) return null;

  // Find Pokémon by UID across all encounters
  let headPokemon: any = null;
  let bodyPokemon: any = null;

  // Debug logging
  console.log('Looking for team member:', teamMember);
  console.log('Available encounters:', Object.keys(activePlaythrough.encounters || {}));

  // Flatten all Pokémon from all encounters into a single collection
  const allPokemon = Object.values(activePlaythrough.encounters || {}).flatMap(encounter => {
    const pokemon = [];
    if (encounter.head) pokemon.push(encounter.head);
    if (encounter.body) pokemon.push(encounter.body);
    return pokemon;
  });

  console.log('All available Pokémon:', allPokemon.map(p => ({ name: p.name, uid: p.uid })));

  // Find Pokémon by UID from the flattened collection
  headPokemon = allPokemon.find(pokemon => pokemon.uid === teamMember.headPokemonUid) || null;
  bodyPokemon = allPokemon.find(pokemon => pokemon.uid === teamMember.bodyPokemonUid) || null;

  if (headPokemon) console.log('Found head Pokémon:', headPokemon);
  if (bodyPokemon) console.log('Found body Pokémon:', bodyPokemon);

  if (!headPokemon && !bodyPokemon) {
    console.log('No Pokémon found for team member:', teamMember);
    return null;
  }

  // Create a combined encounter object for display
  const combinedEncounter = {
    head: headPokemon,
    body: bodyPokemon,
    isFusion: Boolean(headPokemon && bodyPokemon),
    updatedAt: Math.max(
      headPokemon?.updatedAt || 0,
      bodyPokemon?.updatedAt || 0
    ),
  };

  console.log('Returning combined encounter:', combinedEncounter);

  return {
    position,
    encounter: combinedEncounter,
    teamMember,
  };
};

// Helper function to check if team is full
const isTeamFull = (): boolean => {
  const activePlaythrough = getActivePlaythrough();
  if (!activePlaythrough) return true;

  return activePlaythrough.team.members.every(member => member !== null);
};

// Helper function to get available team positions
const getAvailableTeamPositions = (): number[] => {
  const activePlaythrough = getActivePlaythrough();
  if (!activePlaythrough) return [];

  return activePlaythrough.team.members
    .map((member, index) => ({ member, index }))
    .filter(({ member }) => member === null)
    .map(({ index }) => index);
};

export {
  playthroughsStore,
  getActivePlaythrough,
  createPlaythrough,
  setActivePlaythrough,
  cycleGameMode,
  toggleRemixMode,
  setGameMode,
  setRemixMode,
  updatePlaythroughName,
  deletePlaythrough,
  getAllPlaythroughs,
  getCurrentlyLoadedPlaythroughs,
  isRemixModeEnabled,
  getGameMode,
  isRandomizedModeEnabled,
  resetAllPlaythroughs,
  forceSave,
  importPlaythrough,
  getCurrentTimestamp,
  addToTeam,
  removeFromTeam,
  reorderTeam,
  getTeamMemberDetails,
  isTeamFull,
  getAvailableTeamPositions,
};
