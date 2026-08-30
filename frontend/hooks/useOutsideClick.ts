'use client';

import { useEffect, useRef, useCallback } from 'react';

interface UseOutsideClickOptions {
  /** Whether the listener is active (default: true) */
  enabled?: boolean;
  /** Event type to listen for (default: 'mousedown') */
  eventType?: 'mousedown' | 'click';
}

/**
 * Hook that detects clicks outside of the referenced element.
 * Commonly used for dropdowns, modals, and popover menus.
 *
 * @example
 * ```tsx
 * const ref = useOutsideClick(() => setIsOpen(false));
 * return <div ref={ref}>...</div>;
 * ```
 */
export function useOutsideClick(
  callback: () => void,
  options: UseOutsideClickOptions = {},
) {
  const { enabled = true, eventType = 'mousedown' } = options;
  const callbackRef = useRef(callback);
  const elementRef = useRef<HTMLElement | null>(null);

  callbackRef.current = callback;

  const setRef = useCallback((node: HTMLElement | null) => {
    elementRef.current = node;
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleEvent = (event: MouseEvent) => {
      const element = elementRef.current;
      if (!element || element.contains(event.target as Node)) {
        return;
      }

      callbackRef.current();
    };

    document.addEventListener(eventType, handleEvent);

    return () => {
      document.removeEventListener(eventType, handleEvent);
    };
  }, [enabled, eventType]);

  return setRef;
}

export default useOutsideClick;
