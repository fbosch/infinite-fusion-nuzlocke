// Export types

// Export custom location actions
export {
  addCustomLocation,
  getAvailableAfterLocations,
  getCustomLocations,
  getMergedLocations,
  removeCustomLocation,
  updateCustomLocationName,
  validateCustomLocationPlacement,
} from "./customLocations";
// Export encounter actions
export {
  clearEncounterFromLocation,
  createEncounterData,
  createFusion,
  cycleArtworkVariant,
  flipEncounterFusion,
  getEncounters,
  getLocationFromComboboxId,
  markEncounterAsCaptured,
  markEncounterAsDeceased,
  markEncounterAsMissed,
  markEncounterAsReceived,
  moveEncounter,
  moveEncounterAtomic,
  moveEncounterToBox,
  moveTeamMemberToBox,
  moveToOriginalLocation,
  prefetchAdjacentVariants,
  preloadArtworkVariants,
  resetEncounter,
  restorePokemonToTeam,
  setArtworkVariant,
  swapEncounters,
  toggleEncounterFusion,
  updateEncounter,
  updatePokemonByUID,
  updatePokemonInEncounter,
} from "./encounters";
// Export React hooks
export {
  useActivePlaythrough,
  useAllPlaythroughs,
  useAvailableAfterLocations,
  useCustomLocations,
  useEncounter,
  useEncounters,
  useGameMode,
  useIsLoading,
  useIsRandomizedMode,
  useIsRemixMode,
  useIsSaving,
  useMergedLocations,
  usePlaythroughById,
  usePlaythroughsSnapshot,
  usePreferredVariant,
} from "./hooks";
// Export persistence utilities (may be needed for testing or advanced usage)
export {
  deletePlaythroughFromIndexedDB,
  loadAllPlaythroughs,
  loadPlaythroughById,
  saveToIndexedDB,
} from "./persistence";
// Export store and core actions
export {
  createPlaythrough,
  cycleGameMode,
  deletePlaythrough,
  forceSave,
  getActivePlaythrough,
  getAllPlaythroughs,
  getAvailableTeamPositions,
  getCurrentlyLoadedPlaythroughs,
  getGameMode,
  getTeamMemberDetails,
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
} from "./store";
export type {
  EncounterData,
  ExportedPlaythrough,
  GameMode,
  ImportedPlaythrough,
  Playthrough,
  PlaythroughsState,
} from "./types";
export {
  EncounterDataSchema,
  ExportedPlaythroughSchema,
  GameModeSchema,
  ImportedPlaythroughSchema,
  PlaythroughSchema,
  PlaythroughsSchema,
} from "./types";

import * as customLocationActions from "./customLocations";
import * as encounterActions from "./encounters";
// Create a combined actions object for easier usage (similar to the original playthroughActions)
import * as storeActions from "./store";

export const playthroughActions = {
  // Core store actions
  ...storeActions,

  // Encounter actions
  ...encounterActions,

  // Custom location actions
  ...customLocationActions,

  // Add back getAvailablePlaythroughIds that was in the original store
  getAvailablePlaythroughIds: async (): Promise<string[]> => {
    if (typeof window === "undefined") return [];

    try {
      const { get } = await import("idb-keyval");
      const { playthroughsStore_idb } = await import("./persistence");
      return ((await get("playthrough_ids", playthroughsStore_idb)) ||
        []) as string[];
    } catch (error) {
      console.error("Failed to get available playthrough IDs:", error);
      return [];
    }
  },
};
