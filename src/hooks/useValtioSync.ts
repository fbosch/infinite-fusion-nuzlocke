import { useSyncExternalStore } from 'react';
import { subscribe } from 'valtio';

/**
 * Utility hooks for Valtio synchronization that's compatible with React Compiler
 *
 * These hooks provide the same reactivity as useSnapshot but use useSyncExternalStore
 * for better React Compiler compatibility. Use these when you need Valtio reactivity
 * but are experiencing issues with React Compiler optimization.
 *
 * @example
 * // Instead of: const settings = useSnapshot(settingsStore);
 * // Use: const settings = useValtioSync(settingsStore, store => store);
 *
 * // For specific values:
 * const theme = useValtioSync(settingsStore, store => store.theme);
 *
 * // For proxyMap stores:
 * const variant = useValtioMapSync(preferredVariants, store =>
 *   getPreferredVariant(headId, bodyId) ?? ''
 * );
 */

/**
 * Utility hook for Valtio synchronization that's compatible with React Compiler
 *
 * This hook provides the same reactivity as useSnapshot but uses useSyncExternalStore
 * for better React Compiler compatibility.
 *
 * **When to use this vs useSnapshot:**
 * - Use `useSnapshot` by default (it's simpler and more performant)
 * - Use `useValtioSync` when React Compiler is causing reactivity issues
 * - Use `useValtioSync` when you need more explicit control over subscriptions
 *
 * @param store - The Valtio store to subscribe to
 * @param selector - Function to extract the desired value from the store
 * @param serverSnapshot - Value to use during SSR (optional)
 * @returns The selected value from the store
 */
export function useValtioSync<T, S extends object>(
  store: S,
  selector: (store: S) => T,
  serverSnapshot?: T
): T {
  return useSyncExternalStore(
    // Subscribe function
    callback => {
      return subscribe(store, callback);
    },
    // Get snapshot function
    () => selector(store),
    // Server snapshot function
    () => serverSnapshot ?? selector(store)
  );
}

/**
 * Specialized hook for subscribing to Valtio proxyMap stores
 *
 * @param store - The Valtio proxyMap store
 * @param selector - Function to extract the desired value from the store
 * @param serverSnapshot - Value to use during SSR (optional)
 * @returns The selected value from the store
 */
export function useValtioMapSync<T, S extends object>(
  store: S,
  selector: (store: S) => T,
  serverSnapshot?: T
): T {
  return useValtioSync(store, selector, serverSnapshot);
}
