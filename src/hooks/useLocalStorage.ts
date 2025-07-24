import { useCallback, useMemo, useRef, useSyncExternalStore } from 'react';

const callbacks = new Set<(key: string) => void>();

// fallback storage for data that cannot be stored in localStorage
export const fallbackStorage = new Map<string, unknown>();

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
  initialValue: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const stringifiedInitialValue = JSON.stringify(initialValue);

  const getSnapshot = (): string | null => {
    const item =
      // Check if the key exists in fallback storage
      fallbackStorage.has(key)
        ? fallbackStorage.get(key) // use cached value
        : window.localStorage.getItem(key); // otherwise get from localStorage

    return item ? (item as string) : null;
  };

  const initialStorageSnapshot = useRef<string | null>(getSnapshot());

  const initialStorageValue = useRef<T>(
    initialStorageSnapshot
      ? (JSON.parse(initialStorageSnapshot.current as string) as T)
      : initialValue
  );

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
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
      window.addEventListener('storage', onStorageChange);
      return () => {
        callbacks.delete(onChange);
        window.removeEventListener('storage', onStorageChange);
      };
    },
    [key]
  );

  const value = useSyncExternalStore(subscribe, getSnapshot);

  const setState = useCallback<React.Dispatch<React.SetStateAction<T>>>(
    (newValue: React.SetStateAction<T>) => {
      const value =
        typeof newValue === 'function'
          ? (newValue as (prevState: T) => T)(initialStorageValue.current)
          : newValue;

      try {
        initialStorageValue.current = value;
        localStorage.setItem(key, JSON.stringify(value));
        fallbackStorage.delete(key);
      } catch {
        // Store value in fallback storage if there's an error with localStorage
        fallbackStorage.set(key, value);
      }

      triggerCallbacks(key);
    },
    [key]
  );

  return useMemo(
    () => [
      (JSON.parse(value ? value : stringifiedInitialValue) ?? '{}') as T,
      setState,
    ],
    [value, setState, stringifiedInitialValue]
  );
}

export default useLocalStorage;
