import { proxy, subscribe } from "valtio";
import { devtools } from "valtio/utils";
import { getSharedEventProperties } from "@/lib/analytics/selectors";
import {
  type SourceSurface,
  type TriggerMethod,
  trackEvent,
} from "@/lib/analytics/trackEvent";
import type { PokemonOptionType } from "@/loaders/pokemon";
import { buildPokemonUidIndex } from "@/utils/encounter-utils";
import { generatePrefixedId } from "@/utils/id";
import { createDefaultPlaythrough } from "./defaultPlaythrough";
import { prepareImportedPlaythrough } from "./importPipeline";
import {
  createDebouncedSaveAll,
  deletePlaythroughFromIndexedDB,
  loadAllPlaythroughs,
  loadFromIndexedDB,
  loadPlaythroughById,
  saveToIndexedDB,
} from "./persistence";
import {
  getActivePlaythrough,
  getCurrentTimestamp,
  setPlaythroughsStore,
} from "./playthroughState";
import { getAvailableTeamPositionsForMembers } from "./teamPositions";
import {
  DEFAULT_NEW_PLAYTHROUGH_GAME_MODE,
  type GameMode,
  isGameMode,
  type Playthrough,
  type PlaythroughsState,
} from "./types";

// Default state
const defaultState: PlaythroughsState = {
  activePlaythroughId: undefined,
  isLoading: true, // Start in loading state
  isSaving: false,
  playthroughs: [],
};

// Helper functions
const generatePlaythroughId = (): string => generatePrefixedId("playthrough");

interface AnalyticsSourceContext {
  source_surface?: SourceSurface;
  trigger_method?: TriggerMethod;
}

const getAnalyticsSourceContext = ({
  source_surface = "store",
  trigger_method = "programmatic",
}: AnalyticsSourceContext = {}) => ({
  source_surface,
  trigger_method,
});

// Create the playthroughs store with proper SSR handling
let playthroughsStore: PlaythroughsState;

if (typeof window === "undefined") {
  // Server-side: Create a dummy store
  playthroughsStore = proxy<PlaythroughsState>(defaultState);
} else {
  // Client-side: Initialize with default state first, then load from IndexedDB
  playthroughsStore = proxy<PlaythroughsState>(defaultState);

  // Add devtools integration for debugging
  if (process.env.NODE_ENV === "development") {
    devtools(playthroughsStore, { name: "Playthroughs Store" });
  }

  // Load data from IndexedDB asynchronously
  loadFromIndexedDB(playthroughsStore).finally(() => {
    // Keep this explicit for callers that rely on the store-level flag.
    playthroughsStore.isLoading = false;
  });

  // Create debounced save function with store dependencies
  const debouncedSaveAll = createDebouncedSaveAll(playthroughsStore, () =>
    getActivePlaythrough(),
  );

  // Subscribe to store changes and debounce saves
  subscribe(playthroughsStore, () => {
    debouncedSaveAll(playthroughsStore);
  });
}

setPlaythroughsStore(playthroughsStore);

const createPlaythrough = (
  name: string,
  gameMode: GameMode = DEFAULT_NEW_PLAYTHROUGH_GAME_MODE,
): string => {
  const hasExistingPlaythroughs = playthroughsStore.playthroughs.length > 0;

  const newPlaythrough: Playthrough = {
    createdAt: getCurrentTimestamp(),
    encounters: {},
    gameMode,
    id: generatePlaythroughId(),
    name,
    team: { members: Array.from({ length: 6 }, () => null) },
    updatedAt: getCurrentTimestamp(),
    version: "1.0.0",
  };

  playthroughsStore.playthroughs.push(newPlaythrough);

  // Set as active if it's the first playthrough
  if (playthroughsStore.playthroughs.length === 1) {
    playthroughsStore.activePlaythroughId = newPlaythrough.id;
  }

  trackEvent("playthrough_created", {
    ...getSharedEventProperties(newPlaythrough),
    has_existing_playthroughs: hasExistingPlaythroughs,
  });

  return newPlaythrough.id;
};

const setActivePlaythrough = async (
  playthroughId: string,
  sourceContext?: AnalyticsSourceContext,
) => {
  const previousPlaythroughId = playthroughsStore.activePlaythroughId;

  // Check if the playthrough is already loaded
  let playthrough = playthroughsStore.playthroughs.find(
    (p: Playthrough) => p.id === playthroughId,
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

    if (previousPlaythroughId && previousPlaythroughId !== playthroughId) {
      trackEvent("playthrough_switched", {
        ...getSharedEventProperties(playthrough),
        new_playthrough_id: playthroughId,
        previous_playthrough_id: previousPlaythroughId,
        ...getAnalyticsSourceContext(sourceContext),
      });
    }
  }
};

const changeActiveGameMode = (
  nextGameMode: GameMode,
  shouldUpdateTimestamp: boolean,
  sourceContext?: AnalyticsSourceContext,
) => {
  const activePlaythrough = getActivePlaythrough();
  if (!activePlaythrough || activePlaythrough.gameMode === nextGameMode) {
    return;
  }

  if (isGameMode(activePlaythrough.gameMode) === false) {
    return;
  }
  const previousGameMode = activePlaythrough.gameMode;
  if (previousGameMode === nextGameMode) {
    return;
  }

  activePlaythrough.gameMode = nextGameMode;

  if (shouldUpdateTimestamp) {
    activePlaythrough.updatedAt = getCurrentTimestamp();
  }

  trackEvent("game_mode_changed", {
    ...getSharedEventProperties(activePlaythrough),
    new_game_mode: nextGameMode,
    previous_game_mode: previousGameMode,
    ...getAnalyticsSourceContext(sourceContext),
  });
};

const cycleGameMode = (sourceContext?: AnalyticsSourceContext) => {
  const activePlaythrough = getActivePlaythrough();
  if (activePlaythrough) {
    const modes = ["classic", "remix", "randomized"] as const;
    if (isGameMode(activePlaythrough.gameMode) === false) {
      return;
    }

    const currentIndex = modes.indexOf(activePlaythrough.gameMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    const nextMode = modes[nextIndex];
    changeActiveGameMode(nextMode, false, sourceContext);
    // Don't update timestamp immediately for UI toggles - let the debounced save handle it
    // This makes the UI more responsive for rapid toggles
  }
};

const toggleRemixMode = (sourceContext?: AnalyticsSourceContext) => {
  const activePlaythrough = getActivePlaythrough();
  if (activePlaythrough) {
    // Convert current mode to boolean logic for backward compatibility
    const isRemix = activePlaythrough.gameMode === "remix";
    changeActiveGameMode(isRemix ? "classic" : "remix", false, sourceContext);
    // Don't update timestamp immediately for UI toggles - let the debounced save handle it
  }
};

const setGameMode = (
  gameMode: GameMode,
  sourceContext?: AnalyticsSourceContext,
) => {
  changeActiveGameMode(gameMode, true, sourceContext);
};

const setRemixMode = (
  enabled: boolean,
  sourceContext?: AnalyticsSourceContext,
) => {
  changeActiveGameMode(enabled ? "remix" : "classic", true, sourceContext);
};

const updatePlaythroughName = (playthroughId: string, name: string) => {
  const playthrough = playthroughsStore.playthroughs.find(
    (p: Playthrough) => p.id === playthroughId,
  );

  if (playthrough) {
    playthrough.name = name;
    playthrough.updatedAt = getCurrentTimestamp();
  }
};

const deletePlaythrough = async (playthroughId: string) => {
  const index = playthroughsStore.playthroughs.findIndex(
    (p: Playthrough) => p.id === playthroughId,
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
  const existingIds = new Set(playthroughsStore.playthroughs.map((p) => p.id));

  // Add new playthroughs that aren't already loaded
  for (const playthrough of allPlaythroughs) {
    if (!existingIds.has(playthrough.id)) {
      playthroughsStore.playthroughs.push(playthrough);
    }
  }

  // Remove playthroughs that no longer exist
  const loadedIds = new Set(allPlaythroughs.map((p) => p.id));
  for (let i = playthroughsStore.playthroughs.length - 1; i >= 0; i--) {
    if (!loadedIds.has(playthroughsStore.playthroughs[i].id)) {
      playthroughsStore.playthroughs.splice(i, 1);
    }
  }

  return [...allPlaythroughs];
};

const getCurrentlyLoadedPlaythroughs = (): Playthrough[] => [
  ...playthroughsStore.playthroughs,
];

const isRemixModeEnabled = (): boolean => {
  const activePlaythrough = getActivePlaythrough();
  return activePlaythrough?.gameMode === "remix";
};

const getGameMode = (): GameMode => {
  const activePlaythrough = getActivePlaythrough();
  return (activePlaythrough?.gameMode as GameMode) || "classic";
};

const importPlaythrough = async (importData: unknown): Promise<string> => {
  const persistedIds = (await loadAllPlaythroughs()).map((p) => p.id);
  const newPlaythrough = await prepareImportedPlaythrough(
    importData,
    new Set([
      ...persistedIds,
      ...playthroughsStore.playthroughs.map((p) => p.id),
    ]),
  );

  playthroughsStore.playthroughs.push(newPlaythrough);
  playthroughsStore.activePlaythroughId = newPlaythrough.id;

  return newPlaythrough.id;
};

const isRandomizedModeEnabled = (): boolean => {
  const activePlaythrough = getActivePlaythrough();
  return activePlaythrough?.gameMode === "randomized";
};

const resetAllPlaythroughs = async () => {
  // Delete all existing playthroughs from IndexedDB in parallel
  const deletePromises = playthroughsStore.playthroughs.map((playthrough) =>
    deletePlaythroughFromIndexedDB(playthrough.id),
  );
  await Promise.all(deletePromises);

  // Create a new default playthrough instead of leaving empty
  const defaultPlaythrough = createDefaultPlaythrough();
  playthroughsStore.playthroughs = [defaultPlaythrough];
  playthroughsStore.activePlaythroughId = defaultPlaythrough.id;
};

const forceSave = async () => {
  if (typeof window === "undefined") {
    return;
  }
  await saveToIndexedDB(playthroughsStore);
};

const removeFromTeam = (position: number): boolean => {
  const activePlaythrough = getActivePlaythrough();
  if (!activePlaythrough) {
    return false;
  }

  // Validate position
  if (position < 0 || position >= 6) {
    return false;
  }

  // Check if position is occupied
  if (activePlaythrough.team.members[position] === null) {
    return false;
  }

  // Remove from team
  activePlaythrough.team.members[position] = null;

  activePlaythrough.updatedAt = getCurrentTimestamp();
  return true;
};

const reorderTeam = (fromPosition: number, toPosition: number): boolean => {
  const activePlaythrough = getActivePlaythrough();
  if (!activePlaythrough) {
    return false;
  }

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
  if (activePlaythrough.team.members[fromPosition] === null) {
    return false;
  }

  // If moving to the same position, no change needed
  if (fromPosition === toPosition) {
    return true;
  }

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
const getTeamMemberDetails = (
  position: number,
  pokemonByUid?: ReadonlyMap<string, PokemonOptionType>,
) => {
  const activePlaythrough = getActivePlaythrough();
  if (!activePlaythrough || position < 0 || position >= 6) {
    return null;
  }

  const teamMember = activePlaythrough.team.members[position];
  if (!teamMember) {
    return null;
  }

  const uidIndex =
    pokemonByUid ?? buildPokemonUidIndex(activePlaythrough.encounters);

  const headPokemon: PokemonOptionType | null =
    uidIndex.get(teamMember.headPokemonUid) ?? null;

  const bodyPokemon: PokemonOptionType | null =
    teamMember.bodyPokemonUid && teamMember.bodyPokemonUid !== ""
      ? (uidIndex.get(teamMember.bodyPokemonUid) ?? null)
      : null;

  if (!(headPokemon || bodyPokemon)) {
    return null;
  }

  // Create a combined encounter object for display
  // A team member is a fusion only if both head and body Pokémon exist
  const isFusion = Boolean(headPokemon && bodyPokemon);
  const combinedEncounter = {
    body: bodyPokemon,
    head: headPokemon,
    isFusion,
    updatedAt: getCurrentTimestamp(), // Use current timestamp since Pokémon don't have updatedAt
  };

  return {
    encounter: combinedEncounter,
    position,
    teamMember,
  };
};

// Helper function to check if team is full
const isTeamFull = (): boolean => {
  const activePlaythrough = getActivePlaythrough();
  if (!activePlaythrough) {
    return true;
  }

  return activePlaythrough.team.members.every((member) => member !== null);
};

// Helper function to get available team positions
const getAvailableTeamPositions = (): number[] => {
  const activePlaythrough = getActivePlaythrough();
  if (!activePlaythrough) {
    return [];
  }

  return getAvailableTeamPositionsForMembers(activePlaythrough.team.members);
};

export {
  createPlaythrough,
  cycleGameMode,
  deletePlaythrough,
  forceSave,
  getActivePlaythrough,
  getAllPlaythroughs,
  getAvailableTeamPositions,
  getCurrentlyLoadedPlaythroughs,
  getCurrentTimestamp,
  getGameMode,
  getTeamMemberDetails,
  importPlaythrough,
  isRandomizedModeEnabled,
  isRemixModeEnabled,
  isTeamFull,
  playthroughsStore,
  removeFromTeam,
  reorderTeam,
  resetAllPlaythroughs,
  setActivePlaythrough,
  setGameMode,
  setRemixMode,
  toggleRemixMode,
  updatePlaythroughName,
};
