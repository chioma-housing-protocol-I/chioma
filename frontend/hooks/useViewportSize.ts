'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export type Orientation = 'portrait' | 'landscape';

export interface ViewportSize {
  /** Current window inner width (pixels) */
  width: number;
  /** Current window inner height (pixels) */
  height: number;
  /** Current device orientation derived from width/height comparison */
  orientation: Orientation;
  /** Raw screen.orientation.type when available, otherwise derived */
  orientationType: string;
  /** Whether the device is a touch-capable mobile device */
  isMobile: boolean;
  /** Dynamic viewport height — suitable for full-height layouts (updates on resize/orientation) */
  dvh: number;
}

interface UseViewportSizeOptions {
  /** Debounce delay in ms (default 150) */
  debounceMs?: number;
}

function getViewportSize(): ViewportSize {
  if (typeof window === 'undefined') {
    return {
      width: 0,
      height: 0,
      orientation: 'portrait',
      orientationType: 'portrait-primary',
      isMobile: false,
      dvh: 0,
    };
  }

  const width = window.innerWidth;
  const height = window.innerHeight;
  const orientation: Orientation = width >= height ? 'landscape' : 'portrait';

  let orientationType = 'portrait-primary';
  if (typeof screen !== 'undefined' && screen.orientation?.type) {
    orientationType = screen.orientation.type;
  }

  const isMobile =
    /Mobi|Android|iPhone|iPad|iPod/i.test(window.navigator.userAgent) ||
    ('ontouchstart' in window && window.innerWidth < 1024);

  // visualViewport is the most reliable on mobile for dynamic viewport height
  const dvh =
    typeof window.visualViewport !== 'undefined' &&
    window.visualViewport !== null
      ? window.visualViewport.height
      : window.innerHeight;

  return { width, height, orientation, orientationType, isMobile, dvh };
}

/**
 * Compare two ViewportSize objects for shallow equality of all fields.
 * Avoids unnecessary re-renders when no values have actually changed.
 */
function sizesAreEqual(a: ViewportSize, b: ViewportSize): boolean {
  return (
    a.width === b.width &&
    a.height === b.height &&
    a.orientation === b.orientation &&
    a.orientationType === b.orientationType &&
    a.isMobile === b.isMobile &&
    a.dvh === b.dvh
  );
}

/**
 * Hook that tracks viewport dimensions, orientation, and device type.
 *
 * Updates on `resize`, `orientationchange`, and `visualViewport` resize events.
 * Automatically debounces updates for performance and skips no-op updates
 * to prevent unnecessary re-renders.
 *
 * @example
 * ```tsx
 * const { width, height, orientation, isMobile, dvh } = useViewportSize();
 * // Use `dvh` for full-height elements on mobile
 * ```
 */
export function useViewportSize(
  options: UseViewportSizeOptions = {},
): ViewportSize {
  const { debounceMs = 150 } = options;

  // SSR-safe initial value: runs on both server and client during render phase.
  // On the server it returns zeros; on the client it returns actual values,
  // avoiding hydration mismatch.
  const [size, setSize] = useState<ViewportSize>(() => getViewportSize());
  const prevSizeRef = useRef<ViewportSize>(size);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const safeSetSize = useCallback((next: ViewportSize) => {
    // Skip update if nothing changed — avoids unnecessary re-renders
    if (sizesAreEqual(prevSizeRef.current, next)) {
      return;
    }
    prevSizeRef.current = next;
    setSize(next);
  }, []);

  const updateSize = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      safeSetSize(getViewportSize());
      timeoutRef.current = null;
    }, debounceMs);
  }, [debounceMs, safeSetSize]);

  useEffect(() => {
    // Set initial size (SSR-safe: window exists after mount)
    safeSetSize(getViewportSize());

    const handleResize = () => updateSize();

    const handleOrientationChange = () => {
      // Small extra delay for orientation change to let the layout settle
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(
        () => {
          safeSetSize(getViewportSize());
          timeoutRef.current = null;
        },
        Math.max(debounceMs, 200),
      );
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleOrientationChange);

    // visualViewport is the most reliable on mobile for dynamic viewport height
    const vv =
      typeof window.visualViewport !== 'undefined' &&
      window.visualViewport !== null
        ? window.visualViewport
        : null;

    if (vv) {
      vv.addEventListener('resize', handleResize);
      vv.addEventListener('scroll', handleResize);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      if (vv) {
        vv.removeEventListener('resize', handleResize);
        vv.removeEventListener('scroll', handleResize);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [updateSize, debounceMs, safeSetSize]);

  return size;
}

export default useViewportSize;
