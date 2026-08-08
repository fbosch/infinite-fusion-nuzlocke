import { useSyncExternalStore } from "react";

export interface SafeParser<T> {
  safeParse: (
    value: unknown,
  ) => { success: true; data: T } | { success: false };
}

const callbacks = new Set<(key: string) => void>();

// fallback storage for data that cannot be stored in localStorage
const fallbackStorage = new Map<string, string>();

function triggerCallbacks(key: string): void {
  for (const callback of [...callbacks]) {
    callback(key);
  }
}

/**
 * A React hook that provides state synchronization with the browser's localStorage.
 *
 * @template T - The type of the value stored in localStorage.
 *
 * @param {string} key - The key under which the value is stored in localStorage.
 * @param {T | undefined} initialValue - The initial value of the state. If the key is not found in localStorage, this value will be used.
 *
 * @returns {[T | undefined, (value: SetStateAction<T>) => void]} An array containing the current value and a function to update the value.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  schema: SafeParser<T>,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const serialize = (value: T): string => JSON.stringify(value) ?? "null";
  const stringifiedInitialValue = serialize(initialValue);

  const parseSnapshot = (snapshot: string | null): T => {
    if (snapshot === null) {
      return initialValue;
    }

    try {
      const parsed = JSON.parse(snapshot);
      const result = schema.safeParse(parsed);
      return result.success ? result.data : initialValue;
    } catch {
      return initialValue;
    }
  };

  const getSnapshot = (): string | null => {
    if (fallbackStorage.has(key)) {
      return fallbackStorage.get(key) ?? null;
    }

    try {
      return typeof window !== "undefined" && globalThis.localStorage
        ? globalThis.localStorage.getItem(key)
        : null;
    } catch {
      return null;
    }
  };

  const subscribe = (onStoreChange: () => void) => {
    // Return early no-op if not in browser environment
    if (typeof window === "undefined") {
      return () => {};
    }

    const onChange = (localKey: string | null) => {
      if (localKey === key) {
        onStoreChange();
      }
    };
    const onStorageChange = (e: StorageEvent) => {
      if (e.storageArea === localStorage) {
        onChange(e.key);
      }
    };
    callbacks.add(onChange);
    window.addEventListener("storage", onStorageChange);
    return () => {
      callbacks.delete(onChange);
      window.removeEventListener("storage", onStorageChange);
    };
  };

  const getServerSnapshot = (): string | null => {
    // On server, always return null since localStorage isn't available
    return null;
  };

  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const setState: React.Dispatch<React.SetStateAction<T>> = (newValue) => {
    const snapshot = getSnapshot();
    const value =
      typeof newValue === "function"
        ? (newValue as (prevState: T) => T)(parseSnapshot(snapshot))
        : newValue;

    try {
      if (typeof window !== "undefined" && globalThis.localStorage) {
        localStorage.setItem(key, serialize(value));
        fallbackStorage.delete(key);
      } else {
        // Store value in fallback storage if not in browser environment
        fallbackStorage.set(key, serialize(value));
      }
    } catch {
      // Store value in fallback storage if there's an error with localStorage
      fallbackStorage.set(key, serialize(value));
    }

    triggerCallbacks(key);
  };

  return [parseSnapshot(value ?? stringifiedInitialValue), setState];
}
