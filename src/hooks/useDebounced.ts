import { useState, useEffect, useCallback } from 'react';
import { debounce } from 'lodash';

/**
 * A hook that debounces a value, useful for expensive operations like API calls or complex calculations.
 * Uses lodash debounce function as the baseline implementation.
 *
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds (default: 300ms)
 * @returns The debounced value
 *
 * @example
 * ```tsx
 * const [searchQuery, setSearchQuery] = useState('');
 * const debouncedSearchQuery = useDebounced(searchQuery, 500);
 *
 * // Use debouncedSearchQuery for API calls
 * useEffect(() => {
 *   if (debouncedSearchQuery) {
 *     searchAPI(debouncedSearchQuery);
 *   }
 * }, [debouncedSearchQuery]);
 * ```
 */
export function useDebounced<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  // Create the debounced function using lodash debounce
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedUpdate = useCallback(
    debounce((newValue: T) => {
      setDebouncedValue(newValue);
    }, delay),
    [delay]
  );

  // Update the debounced value when the input value changes
  useEffect(() => {
    debouncedUpdate(value);
  }, [value, debouncedUpdate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debouncedUpdate.cancel();
    };
  }, [debouncedUpdate]);

  return debouncedValue;
}
