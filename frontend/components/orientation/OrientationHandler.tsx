'use client';

import { useEffect, useRef } from 'react';
import { useViewportSize } from '@/hooks/useViewportSize';

/**
 * Global orientation handler component.
 *
 * Responsibilities:
 * 1. Sets `--dvh` CSS custom property for dynamic viewport height (mobile-safe full-height)
 * 2. Sets `data-orientation` attribute on `<html>` for responsive CSS targeting
 * 3. Sets `data-mobile` attribute when on a mobile device
 * 4. Logs orientation changes for debugging in development
 *
 * Include this once near the root of the app (e.g., in RootLayoutClient).
 */
export function OrientationHandler() {
  const { orientation, isMobile, dvh } = useViewportSize();
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    // Use requestAnimationFrame for smooth visual updates
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      const root = document.documentElement;

      // Set dynamic viewport height (handles mobile address bar, orientation)
      root.style.setProperty('--dvh', `${dvh}px`);

      // Orientation data attribute for CSS targeting
      root.setAttribute('data-orientation', orientation);

      // Mobile device detection for CSS targeting
      if (isMobile) {
        root.setAttribute('data-mobile', 'true');
      } else {
        root.removeAttribute('data-mobile');
      }
    });

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      // Clean up CSS custom property on unmount (defensive, component is root-level)
      document.documentElement.style.removeProperty('--dvh');
      document.documentElement.removeAttribute('data-orientation');
      document.documentElement.removeAttribute('data-mobile');
    };
  }, [dvh, orientation, isMobile]);

  // This component renders nothing — it only sets attributes and CSS variables
  return null;
}

export default OrientationHandler;
