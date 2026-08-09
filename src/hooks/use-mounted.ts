import { useSyncExternalStore } from "react";

const subscribeToHydration = () => () => {
  // Hydration has no external subscription to clean up.
};
const getClientMountedSnapshot = () => true;
const getServerMountedSnapshot = () => false;

export function useMounted() {
  return useSyncExternalStore(
    subscribeToHydration,
    getClientMountedSnapshot,
    getServerMountedSnapshot,
  );
}
