'use client';

import { useState, useEffect } from 'react';

/**
 * Hook that debounces a value by a specified delay.
 * Returns the debounced value that updates only after the delay has passed
 * without the original value changing.
 *
 * @example
 * ```tsx
 * const [search, setSearch] = useState('');
 * const debouncedSearch = useDebounce(search, 300);
 *
 * // debouncedSearch updates 300ms after the user stops typing
 * useEffect(() => {
 *   if (debouncedSearch.length >= 2) {
 *     fetchSuggestions(debouncedSearch);
 *   }
 * }, [debouncedSearch]);
 * ```
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;
