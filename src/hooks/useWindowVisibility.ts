import { useSyncExternalStore } from 'react';

// Shared store for window visibility state
let listeners: Set<() => void> | null = null;
let isVisible =
  typeof document !== 'undefined'
    ? document.visibilityState === 'visible'
    : true;
let isFocused = typeof window !== 'undefined' ? document.hasFocus() : true;

function subscribe(callback: () => void) {
  if (!listeners) {
    listeners = new Set();

    // Add event listeners only once
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', notifyListeners);
      window.addEventListener('focus', notifyListeners);
      window.addEventListener('blur', notifyListeners);
    }
  }

  listeners.add(callback);

  // Return cleanup function
  return () => {
    listeners?.delete(callback);
  };
}

function notifyListeners() {
  if (typeof document !== 'undefined') {
    const newIsVisible = document.visibilityState === 'visible';
    const newIsFocused = document.hasFocus();

    // Always update and notify, even if values haven't changed
    // This ensures React gets notified of all state changes
    isVisible = newIsVisible;
    isFocused = newIsFocused;

    listeners?.forEach(listener => listener());
  }
}

function getSnapshot() {
  return isVisible && isFocused;
}

/**
 * Hook to subscribe to window visibility changes using useSyncExternalStore
 * @returns boolean indicating if the window is currently visible
 */
export function useWindowVisibility(): boolean {
  return useSyncExternalStore(
    subscribe,
    // Server-side snapshot
    () => true,
    // Client-side snapshot
    getSnapshot
  );
}
