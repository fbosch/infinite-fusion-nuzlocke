import {
  addCustomLocation,
  getAvailableAfterLocations,
  getCustomLocations,
  getMergedLocations,
  removeCustomLocation,
  updateCustomLocationName,
  validateCustomLocationPlacement,
} from "./customLocations";
import {
  getEncounters,
  resetEncounter,
  updateEncounter,
  updatePokemonInEncounter,
} from "./encounters/crud";
import {
  clearEncounterFromLocation,
  getLocationFromComboboxId,
  moveEncounter,
  moveEncounterAtomic,
  moveToOriginalLocation,
  relocateEncounterSlot,
  swapEncounters,
} from "./encounters/drag-drop";
import {
  createFusion,
  flipEncounterFusion,
  toggleEncounterFusion,
} from "./encounters/fusion";
import {
  markEncounterAsCaptured,
  markEncounterAsDeceased,
  markEncounterAsMissed,
  markEncounterAsReceived,
  moveEncounterToBox,
} from "./encounters/status";
import {
  moveTeamMemberToBox,
  restorePokemonToTeam,
  updatePokemonByUID,
  updateTeamMember,
} from "./encounters/team";
import {
  flipTeamMemberFusion,
  markTeamMemberAsDeceased,
} from "./encounters/team-actions";
import {
  cycleArtworkVariant,
  prefetchAdjacentVariants,
  preloadArtworkVariants,
  setArtworkVariant,
} from "./encounters/variants";
import {
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
} from "./store";

// The aggregate action API remains the only public entry point for state mutations.
export const playthroughActions = {
  // Custom location actions
  addCustomLocation,
  clearEncounterFromLocation,
  createFusion,

  // Core store actions
  createPlaythrough,
  cycleArtworkVariant,
  cycleGameMode,
  deletePlaythrough,
  flipEncounterFusion,
  flipTeamMemberFusion,
  forceSave,
  getActivePlaythrough,
  getAllPlaythroughs,
  getAvailableAfterLocations,

  // Add back getAvailablePlaythroughIds that was in the original store
  getAvailablePlaythroughIds: async (): Promise<string[]> => {
    if (typeof window === "undefined") {
      return [];
    }

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
  getAvailableTeamPositions,
  getCurrentlyLoadedPlaythroughs,
  getCurrentTimestamp,
  getCustomLocations,
  getEncounters,
  getGameMode,
  getLocationFromComboboxId,
  getMergedLocations,
  getTeamMemberDetails,
  importPlaythrough,
  isRandomizedModeEnabled,
  isRemixModeEnabled,
  isTeamFull,
  markEncounterAsCaptured,
  markEncounterAsDeceased,
  markEncounterAsMissed,
  markEncounterAsReceived,
  markTeamMemberAsDeceased,
  moveEncounter,
  moveEncounterAtomic,
  moveEncounterToBox,
  moveTeamMemberToBox,
  moveToOriginalLocation,
  playthroughsStore,
  prefetchAdjacentVariants,
  preloadArtworkVariants,
  relocateEncounterSlot,
  removeCustomLocation,
  removeFromTeam,
  reorderTeam,
  resetAllPlaythroughs,
  resetEncounter,
  restorePokemonToTeam,
  setActivePlaythrough,
  setArtworkVariant,
  setGameMode,
  setRemixMode,
  swapEncounters,
  toggleEncounterFusion,
  toggleRemixMode,
  updateCustomLocationName,
  updateEncounter,
  updatePlaythroughName,
  updatePokemonByUID,
  updatePokemonInEncounter,
  updateTeamMember,
  validateCustomLocationPlacement,
};
