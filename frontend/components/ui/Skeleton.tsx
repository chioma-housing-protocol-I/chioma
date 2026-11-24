import React from 'react';

import { cn } from '@/lib/utils';

/**
 * Composable skeleton primitives for loading states.
 *
 * Every primitive accepts `className` so callers can size and shape it, and
 * `animate` to turn the pulse off (the pulse is also disabled automatically
 * for users who prefer reduced motion). Wrap composed skeletons in
 * `SkeletonGroup` to expose a single loading status to assistive tech.
 */

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Pulse animation. Defaults to `true`. */
  animate?: boolean;
}

/** Base placeholder block. Size it with Tailwind classes (`h-4 w-32`). */
export function Skeleton({
  animate = true,
  className,
  ...props
}: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'rounded bg-neutral-200 dark:bg-slate-700/50',
        animate && 'animate-pulse motion-reduce:animate-none',
        className,
      )}
      {...props}
    />
  );
}

export interface SkeletonTextProps {
  /** Number of lines. The last line is shortened to look like real text. */
  lines?: number;
  animate?: boolean;
  className?: string;
  /** Extra classes applied to every line (e.g. `h-4`). */
  lineClassName?: string;
}

export function SkeletonText({
  lines = 3,
  animate = true,
  className,
  lineClassName,
}: SkeletonTextProps) {
  const count = Math.max(1, lines);
  return (
    <div className={cn('space-y-2', className)} aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton
          key={`line-${index}`}
          animate={animate}
          className={cn(
            'h-3',
            count > 1 && index === count - 1 ? 'w-2/3' : 'w-full',
            lineClassName,
          )}
        />
      ))}
    </div>
  );
}

const AVATAR_SIZES = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-14 w-14',
} as const;

export interface SkeletonAvatarProps {
  size?: keyof typeof AVATAR_SIZES;
  /** `circle` (default) or `square` with rounded corners. */
  shape?: 'circle' | 'square';
  animate?: boolean;
  className?: string;
}

export function SkeletonAvatar({
  size = 'md',
  shape = 'circle',
  animate = true,
  className,
}: SkeletonAvatarProps) {
  return (
    <Skeleton
      animate={animate}
      className={cn(
        'shrink-0',
        AVATAR_SIZES[size],
        shape === 'circle' ? 'rounded-full' : 'rounded-lg',
        className,
      )}
    />
  );
}

export interface SkeletonTableRowProps {
  columns?: number;
  animate?: boolean;
  className?: string;
}

export function SkeletonTableRow({
  columns = 4,
  animate = true,
  className,
}: SkeletonTableRowProps) {
  const count = Math.max(1, columns);
  return (
    <div
      aria-hidden="true"
      className={cn(
        'grid gap-3 rounded-lg border border-neutral-200 bg-white p-4 dark:border-white/10 dark:bg-slate-800/50',
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={`cell-${index}`} animate={animate} className="h-4" />
      ))}
    </div>
  );
}

export interface SkeletonCardBlockProps {
  /** Show the media placeholder at the top. Defaults to `true`. */
  media?: boolean;
  /** Show an avatar + title header row. */
  header?: boolean;
  lines?: number;
  animate?: boolean;
  className?: string;
  /** Replace the default body with custom skeleton content. */
  children?: React.ReactNode;
}

export function SkeletonCardBlock({
  media = true,
  header = false,
  lines = 2,
  animate = true,
  className,
  children,
}: SkeletonCardBlockProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'space-y-4 rounded-xl border border-neutral-200 bg-white p-4 dark:border-white/10 dark:bg-slate-800/50',
        className,
      )}
    >
      {media && <Skeleton animate={animate} className="h-40 rounded-lg" />}
      {header && (
        <div className="flex items-center gap-3">
          <SkeletonAvatar animate={animate} />
          <div className="flex-1 space-y-2">
            <Skeleton animate={animate} className="h-4 w-1/3" />
            <Skeleton animate={animate} className="h-3 w-1/4" />
          </div>
        </div>
      )}
      {children ?? (
        <>
          <Skeleton animate={animate} className="h-5 w-2/3" />
          <SkeletonText lines={lines} animate={animate} />
        </>
      )}
    </div>
  );
}

export interface SkeletonGroupProps
  extends React.HTMLAttributes<HTMLDivElement> {
  /** Screen-reader text announced while content loads. */
  label?: string;
}

/**
 * Wraps one or more skeletons and announces a single loading status,
 * so screen readers hear "Loading…" once instead of nothing at all.
 */
export function SkeletonGroup({
  label = 'Loading…',
  className,
  children,
  ...props
}: SkeletonGroupProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={className}
      {...props}
    >
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
