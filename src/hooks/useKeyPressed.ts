import { useSyncExternalStore } from 'react';

// Global state for all keys
const keyStates = new Map<string, boolean>();
const keyListeners = new Map<string, Set<() => void>>();

// Track if global event listeners are attached
let globalListenersAttached = false;

// Get total number of active subscriptions across all keys
function getTotalSubscriptions(): number {
  let total = 0;
  for (const listeners of keyListeners.values()) {
    total += listeners.size;
  }
  return total;
}

// Subscribe function for useSyncExternalStore
function subscribe(key: string) {
  return (listener: () => void) => {
    // Initialize key state if not exists
    if (!keyStates.has(key)) {
      keyStates.set(key, false);
    }

    // Initialize listeners set for this key if not exists
    if (!keyListeners.has(key)) {
      keyListeners.set(key, new Set());
    }

    // Add listener for this key
    keyListeners.get(key)!.add(listener);

    // Add global event listeners if this is the first subscription across all keys
    if (!globalListenersAttached) {
      document.addEventListener('keydown', handleKeyDown);
      document.addEventListener('keyup', handleKeyUp);
      window.addEventListener('blur', handleWindowBlur);
      globalListenersAttached = true;
    }

    // Return unsubscribe function
    return () => {
      const listeners = keyListeners.get(key);
      if (listeners) {
        listeners.delete(listener);

        // Clean up empty listener sets
        if (listeners.size === 0) {
          keyListeners.delete(key);
          keyStates.delete(key);
        }
      }

      // Remove global event listeners if no subscriptions remain
      if (getTotalSubscriptions() === 0 && globalListenersAttached) {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('keyup', handleKeyUp);
        window.removeEventListener('blur', handleWindowBlur);
        globalListenersAttached = false;

        // Clear all state when no subscribers
        keyStates.clear();
        keyListeners.clear();
      }
    };
  };
}

// Get current state for a specific key
function getSnapshot(key: string) {
  return () => keyStates.get(key) ?? false;
}

// Server-side snapshot (always false)
function getServerSnapshot() {
  return false;
}

// Event handlers
function handleKeyDown(event: KeyboardEvent) {
  const currentState = keyStates.get(event.key);
  if (currentState !== true) {
    keyStates.set(event.key, true);
    notifyListeners(event.key);
  }
}

function handleKeyUp(event: KeyboardEvent) {
  const currentState = keyStates.get(event.key);
  if (currentState === true) {
    keyStates.set(event.key, false);
    notifyListeners(event.key);
  }
}

function handleWindowBlur() {
  // Reset all pressed keys on window blur
  const keysToReset: string[] = [];

  for (const [key, isPressed] of keyStates.entries()) {
    if (isPressed) {
      keysToReset.push(key);
    }
  }

  for (const key of keysToReset) {
    keyStates.set(key, false);
    notifyListeners(key);
  }
}

// Notify listeners for a specific key
function notifyListeners(key: string) {
  const listeners = keyListeners.get(key);
  if (listeners) {
    listeners.forEach(listener => listener());
  }
}

/**
 * Hook to track whether a specific key is currently pressed.
 * Uses useSyncExternalStore for efficient subscription to keyboard events.
 * Multiple instances of this hook share the same global event listeners.
 *
 * @param key - The key to track (e.g., 'Shift', 'Control', 'Alt', 'Enter', 'a', etc.)
 * @returns {boolean} True if the specified key is currently pressed, false otherwise
 */
export function useKeyPressed(key: string): boolean {
  return useSyncExternalStore(
    subscribe(key),
    getSnapshot(key),
    getServerSnapshot
  );
}

/**
 * Convenience hook for tracking the Shift key specifically.
 *
 * @returns {boolean} True if shift key is currently pressed, false otherwise
 */
export function useShiftKey(): boolean {
  return useKeyPressed('Shift');
}

/**
 * Convenience hook for tracking the Control key specifically.
 *
 * @returns {boolean} True if control key is currently pressed, false otherwise
 */
export function useControlKey(): boolean {
  return useKeyPressed('Control');
}

/**
 * Convenience hook for tracking the Alt key specifically.
 *
 * @returns {boolean} True if alt key is currently pressed, false otherwise
 */
export function useAltKey(): boolean {
  return useKeyPressed('Alt');
}

/**
 * Convenience hook for tracking the Meta key (Cmd on Mac, Windows key on PC) specifically.
 *
 * @returns {boolean} True if meta key is currently pressed, false otherwise
 */
export function useMetaKey(): boolean {
  return useKeyPressed('Meta');
}
