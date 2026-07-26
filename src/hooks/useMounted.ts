import { useSyncExternalStore } from "react";

const subscribeToHydration = () => () => {};
const getClientMountedSnapshot = () => true;
const getServerMountedSnapshot = () => false;

export function useMounted() {
  return useSyncExternalStore(
    subscribeToHydration,
    getClientMountedSnapshot,
    getServerMountedSnapshot,
  );
}
