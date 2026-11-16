'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const STORAGE_KEY_PREFIX = 'scroll-position:';

function storageKey(path: string): string {
  return `${STORAGE_KEY_PREFIX}${path}`;
}

/**
 * Restores the scroll position for the current route (path + query string)
 * when the user navigates back to it, and saves the position as they scroll
 * away. Next.js App Router resets scroll to the top on every navigation by
 * default, which loses the reader's place in a scrollable list (e.g.
 * clicking into a property, then back) even though the browser's native
 * back/forward would otherwise remember it.
 *
 * Position is kept in sessionStorage, keyed by path + query string, so
 * returning to the same filtered/paginated view restores the right spot
 * and a closed tab doesn't leave stale entries behind.
 */
export function useScrollRestoration(): void {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const key = storageKey(`${pathname}?${searchParams.toString()}`);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(key);
      if (saved !== null) {
        const y = Number(saved);
        if (Number.isFinite(y)) {
          window.scrollTo(0, y);
        }
      }
    } catch {
      // See the try/catch in handleScroll below.
    }

    const handleScroll = () => {
      try {
        sessionStorage.setItem(key, String(window.scrollY));
      } catch {
        // sessionStorage can throw in private browsing with blocked site
        // data; losing scroll restoration there is an acceptable fallback.
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [key]);
}
