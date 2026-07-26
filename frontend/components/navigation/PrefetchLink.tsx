'use client';

import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useRef,
  type ComponentProps,
  type FocusEvent,
  type MouseEvent,
  type PointerEvent,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  prefetchDetailByKind,
  type PrefetchKind,
} from '@/lib/query/prefetch';

/** Delay before treating hover/focus as real navigation intent (ms). */
export const PREFETCH_INTENT_DELAY_MS = 120;

export type PrefetchLinkProps = ComponentProps<typeof Link> & {
  /**
   * Detail domain to warm in React Query on intent.
   * Route chunks still use Next.js Link; set `prefetch={false}` (default)
   * on dense lists to avoid viewport over-fetching.
   */
  prefetchKind?: PrefetchKind;
  /** Entity id for detail data prefetch. Required when prefetchKind !== 'none'. */
  prefetchId?: string;
  /** Override intent delay (ms). */
  intentDelayMs?: number;
};

/**
 * Link tuned for hot list → detail paths.
 *
 * - Defaults `prefetch={false}` so dense grids do not eagerly fetch every route.
 * - On hover / focus intent, prefetches detail query data (deduped) so
 *   navigation feels instant without waterfall requests.
 */
export function PrefetchLink({
  prefetch = false,
  prefetchKind = 'none',
  prefetchId,
  intentDelayMs = PREFETCH_INTENT_DELAY_MS,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  onPointerEnter,
  onPointerLeave,
  children,
  ...rest
}: PrefetchLinkProps) {
  const queryClient = useQueryClient();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didPrefetchRef = useRef(false);

  const clearIntent = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const runPrefetch = useCallback(() => {
    if (didPrefetchRef.current) return;
    if (prefetchKind === 'none' || !prefetchId) return;
    didPrefetchRef.current = true;
    void prefetchDetailByKind(queryClient, prefetchKind, prefetchId);
  }, [prefetchId, prefetchKind, queryClient]);

  const schedulePrefetch = useCallback(() => {
    if (didPrefetchRef.current) return;
    if (prefetchKind === 'none' || !prefetchId) return;
    clearIntent();
    timerRef.current = setTimeout(runPrefetch, intentDelayMs);
  }, [
    clearIntent,
    intentDelayMs,
    prefetchId,
    prefetchKind,
    runPrefetch,
  ]);

  useEffect(() => () => clearIntent(), [clearIntent]);

  const handlePointerEnter = (e: PointerEvent<HTMLAnchorElement>) => {
    schedulePrefetch();
    onPointerEnter?.(e);
  };

  const handlePointerLeave = (e: PointerEvent<HTMLAnchorElement>) => {
    clearIntent();
    onPointerLeave?.(e);
  };

  const handleMouseEnter = (e: MouseEvent<HTMLAnchorElement>) => {
    schedulePrefetch();
    onMouseEnter?.(e);
  };

  const handleMouseLeave = (e: MouseEvent<HTMLAnchorElement>) => {
    clearIntent();
    onMouseLeave?.(e);
  };

  const handleFocus = (e: FocusEvent<HTMLAnchorElement>) => {
    schedulePrefetch();
    onFocus?.(e);
  };

  const handleBlur = (e: FocusEvent<HTMLAnchorElement>) => {
    clearIntent();
    onBlur?.(e);
  };

  return (
    <Link
      {...rest}
      prefetch={prefetch}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {children}
    </Link>
  );
}

export default PrefetchLink;
