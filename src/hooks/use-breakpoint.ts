import { useSyncExternalStore } from "react";
import type { Breakpoint } from "@/utils/breakpoints";
import { breakpoints, getBreakpoint } from "@/utils/breakpoints";

const breakpointOrder: readonly Breakpoint[] = ["sm", "md", "lg", "xl", "2xl"];

// Create a simple store that uses matchMedia for breakpoint detection
const createBreakpointStore = () => {
  let listeners: Array<() => void> = [];
  const mediaQueries: MediaQueryList[] = [];

  const subscribe = (listener: () => void) => {
    listeners.push(listener);

    if (typeof window !== "undefined") {
      window.addEventListener("resize", notify);
    }

    // Set up matchMedia listeners if not already done
    if (mediaQueries.length === 0 && typeof window !== "undefined") {
      // Create media queries for each breakpoint
      for (const width of Object.values(breakpoints)) {
        const query = window.matchMedia(`(min-width: ${width}px)`);
        query.addEventListener("change", notify);
        mediaQueries.push(query);
      }
    }

    return () => {
      listeners = listeners.filter((l) => l !== listener);

      if (listeners.length === 0 && typeof window !== "undefined") {
        window.removeEventListener("resize", notify);
      }
    };
  };

  const getSnapshot = () => {
    if (typeof window === "undefined") {
      return "sm" as Breakpoint; // Default for SSR
    }

    return getBreakpoint(window.innerWidth);
  };

  const notify = () => {
    for (const listener of listeners) {
      listener();
    }
  };

  return { getSnapshot, subscribe };
};

// Create singleton store instance
const breakpointStore = createBreakpointStore();

/**
 * Hook to subscribe to breakpoint changes using syncExternalStore and matchMedia API
 * @returns Current breakpoint ('sm', 'md', 'lg', 'xl', '2xl')
 */
export function useBreakpoint(): Breakpoint {
  return useSyncExternalStore(
    breakpointStore.subscribe,
    breakpointStore.getSnapshot,
    breakpointStore.getSnapshot,
  );
}

/**
 * Hook to check if current breakpoint matches a specific breakpoint or is larger
 * @param breakpoint - The breakpoint to check against
 * @returns True if current breakpoint is at least the specified breakpoint
 */
export function useBreakpointAtLeast(breakpoint: Breakpoint): boolean {
  const currentBreakpoint = useBreakpoint();
  const currentIndex = breakpointOrder.indexOf(currentBreakpoint);
  const targetIndex = breakpointOrder.indexOf(breakpoint);

  return currentIndex >= targetIndex;
}

/**
 * Hook to check if current breakpoint is smaller than a specific breakpoint
 * @param breakpoint - The breakpoint to check against
 * @returns True if current breakpoint is smaller than the specified breakpoint
 */
export function useBreakpointSmallerThan(breakpoint: Breakpoint): boolean {
  const currentBreakpoint = useBreakpoint();
  const currentIndex = breakpointOrder.indexOf(currentBreakpoint);
  const targetIndex = breakpointOrder.indexOf(breakpoint);

  return currentIndex < targetIndex;
}

/**
 * Hook to check if current breakpoint is between two breakpoints (inclusive)
 * @param min - Minimum breakpoint (inclusive)
 * @param max - Maximum breakpoint (inclusive)
 * @returns True if current breakpoint is between min and max
 */
export function useBreakpointBetween(
  min: Breakpoint,
  max: Breakpoint,
): boolean {
  const currentBreakpoint = useBreakpoint();
  const currentIndex = breakpointOrder.indexOf(currentBreakpoint);
  const minIndex = breakpointOrder.indexOf(min);
  const maxIndex = breakpointOrder.indexOf(max);

  return currentIndex >= minIndex && currentIndex <= maxIndex;
}

export type { Breakpoint } from "@/utils/breakpoints";
