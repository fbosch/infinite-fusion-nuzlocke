// Export types
export type {
  GameMode,
  EncounterData,
  Playthrough,
  PlaythroughsState,
  ExportedPlaythrough,
  ExportablePlaythrough,
} from './types';

export {
  GameModeSchema,
  EncounterDataSchema,
  PlaythroughSchema,
  PlaythroughsSchema,
} from './types';

// Export store and core actions
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
} from './store';

// Export encounter actions
export {
  createEncounterData,
  getEncounters,
  updateEncounter,
  resetEncounter,
  toggleEncounterFusion,
  flipEncounterFusion,
  moveEncounterAtomic,
  createFusion,
  setArtworkVariant,
  prefetchAdjacentVariants,
  cycleArtworkVariant,
  preloadArtworkVariants,
  clearEncounterFromLocation,
  moveEncounter,
  swapEncounters,
  moveToOriginalLocation,
  getLocationFromComboboxId,
  markEncounterAsDeceased,
  moveEncounterToBox,
  markEncounterAsCaptured,
  markEncounterAsMissed,
  markEncounterAsReceived,
} from './encounters';

// Export custom location actions
export {
  addCustomLocation,
  removeCustomLocation,
  updateCustomLocationName,
  getCustomLocations,
  validateCustomLocationPlacement,
  getAvailableAfterLocations,
  getMergedLocations,
} from './customLocations';

// Export React hooks
export {
  usePlaythroughsSnapshot,
  useAllPlaythroughs,
  useActivePlaythrough,
  useIsRemixMode,
  useGameMode,
  useIsRandomizedMode,
  usePlaythroughById,
  useIsLoading,
  useEncounters,
  useEncounter,
  useIsSaving,
  useCustomLocations,
  useMergedLocations,
  useAvailableAfterLocations,
  usePreferredVariant,
} from './hooks';

// Export persistence utilities (may be needed for testing or advanced usage)
export {
  loadPlaythroughById,
  loadAllPlaythroughs,
  deletePlaythroughFromIndexedDB,
  saveToIndexedDB,
} from './persistence';

// Create a combined actions object for easier usage (similar to the original playthroughActions)
import * as storeActions from './store';
import * as encounterActions from './encounters';
import * as customLocationActions from './customLocations';

export const playthroughActions = {
  // Core store actions
  ...storeActions,

  // Encounter actions
  ...encounterActions,

  // Custom location actions
  ...customLocationActions,

  // Add back getAvailablePlaythroughIds that was in the original store
  getAvailablePlaythroughIds: async (): Promise<string[]> => {
    if (typeof window === 'undefined') return [];

    try {
      const { get } = await import('idb-keyval');
      const { playthroughsStore_idb } = await import('./persistence');
      return ((await get('playthrough_ids', playthroughsStore_idb)) ||
        []) as string[];
    } catch (error) {
      console.error('Failed to get available playthrough IDs:', error);
      return [];
    }
  },
};
