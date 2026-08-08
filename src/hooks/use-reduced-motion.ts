import { useSyncExternalStore } from "react";
import { getBrowserReducedMotion } from "@/lib/reducedMotion";

const mediaQuery = "(prefers-reduced-motion: reduce)";

const subscribeToBrowserReducedMotion = (onStoreChange: () => void) => {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return () => {
      // No media query listener was registered outside the browser.
    };
  }

  const query = window.matchMedia(mediaQuery);
  if (typeof query.addEventListener === "function") {
    query.addEventListener("change", onStoreChange);
    return () => query.removeEventListener("change", onStoreChange);
  }

  query.addListener(onStoreChange);
  return () => query.removeListener(onStoreChange);
};

export function useReducedMotion(preference: boolean | undefined): boolean {
  const browserPreference = useSyncExternalStore(
    subscribeToBrowserReducedMotion,
    getBrowserReducedMotion,
    () => false,
  );

  return preference ?? browserPreference;
}
