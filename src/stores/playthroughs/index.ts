import * as customLocationActions from "./customLocations";
import * as encounterActions from "./encounters";
import * as storeActions from "./store";

// The aggregate action API remains the only public entry point for state mutations.
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
