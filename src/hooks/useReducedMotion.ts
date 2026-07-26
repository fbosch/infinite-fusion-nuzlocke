import { useSyncExternalStore } from "react";
import { getBrowserReducedMotion } from "@/lib/reducedMotion";

const mediaQuery = "(prefers-reduced-motion: reduce)";

const subscribeToBrowserReducedMotion = (onStoreChange: () => void) => {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return () => {};
  }

  const query = window.matchMedia(mediaQuery);
  query.addEventListener("change", onStoreChange);
  return () => query.removeEventListener("change", onStoreChange);
};

export function useReducedMotion(preference: boolean | undefined): boolean {
  const browserPreference = useSyncExternalStore(
    subscribeToBrowserReducedMotion,
    getBrowserReducedMotion,
    () => false,
  );

  return preference ?? browserPreference;
}
