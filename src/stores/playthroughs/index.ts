import * as customLocationActions from "./customLocations";
import * as encounterActions from "./encounters";
import { getEncounters } from "./encounters/crud";
import { updatePokemonByUID } from "./encounters/team";
import {
  cycleArtworkVariant,
  prefetchAdjacentVariants,
  preloadArtworkVariants,
  setArtworkVariant,
} from "./encounters/variants";
import * as storeActions from "./store";

// The aggregate action API remains the only public entry point for state mutations.
export const playthroughActions = {
  // Core store actions
  ...storeActions,

  // Encounter actions
  ...encounterActions,
  getEncounters,
  updatePokemonByUID,
  cycleArtworkVariant,
  prefetchAdjacentVariants,
  preloadArtworkVariants,
  setArtworkVariant,

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
