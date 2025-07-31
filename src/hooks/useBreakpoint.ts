import { useSyncExternalStore } from 'react';
import {
  breakpoints,
  getBreakpoint,
  type Breakpoint,
} from '@/utils/breakpoints';

// Create a simple store that uses matchMedia for breakpoint detection
const createBreakpointStore = () => {
  let listeners: (() => void)[] = [];
  const mediaQueries: MediaQueryList[] = [];

  const subscribe = (listener: () => void) => {
    listeners.push(listener);

    // Set up matchMedia listeners if not already done
    if (mediaQueries.length === 0 && typeof window !== 'undefined') {
      // Create media queries for each breakpoint
      Object.values(breakpoints).forEach(width => {
        const query = window.matchMedia(`(min-width: ${width}px)`);
        query.addEventListener('change', notify);
        mediaQueries.push(query);
      });
    }

    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  };

  const getSnapshot = () => {
    if (typeof window === 'undefined') {
      return 'sm' as Breakpoint; // Default for SSR
    }

    return getBreakpoint(window.innerWidth);
  };

  const notify = () => {
    listeners.forEach(listener => listener());
  };

  return { subscribe, getSnapshot };
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
    breakpointStore.getSnapshot
  );
}

/**
 * Hook to check if current breakpoint matches a specific breakpoint or is larger
 * @param breakpoint - The breakpoint to check against
 * @returns True if current breakpoint is at least the specified breakpoint
 */
export function useBreakpointAtLeast(breakpoint: Breakpoint): boolean {
  const currentBreakpoint = useBreakpoint();
  const currentIndex = Object.keys(breakpoints).indexOf(currentBreakpoint);
  const targetIndex = Object.keys(breakpoints).indexOf(breakpoint);

  return currentIndex >= targetIndex;
}

/**
 * Hook to check if current breakpoint is smaller than a specific breakpoint
 * @param breakpoint - The breakpoint to check against
 * @returns True if current breakpoint is smaller than the specified breakpoint
 */
export function useBreakpointSmallerThan(breakpoint: Breakpoint): boolean {
  const currentBreakpoint = useBreakpoint();
  const currentIndex = Object.keys(breakpoints).indexOf(currentBreakpoint);
  const targetIndex = Object.keys(breakpoints).indexOf(breakpoint);

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
  max: Breakpoint
): boolean {
  const currentBreakpoint = useBreakpoint();
  const currentIndex = Object.keys(breakpoints).indexOf(currentBreakpoint);
  const minIndex = Object.keys(breakpoints).indexOf(min);
  const maxIndex = Object.keys(breakpoints).indexOf(max);

  return currentIndex >= minIndex && currentIndex <= maxIndex;
}

// Export breakpoint values for reference
export { breakpoints };
export type { Breakpoint };
