import React from 'react';

import {
  Skeleton,
  SkeletonAvatar,
  SkeletonCardBlock,
  SkeletonTableRow,
  SkeletonText,
} from './Skeleton';

type SkeletonVariant = 'text' | 'card' | 'avatar' | 'table-row';

export interface SkeletonLoaderProps {
  variant?: SkeletonVariant;
  /** Number of text lines (text and card variants). */
  lines?: number;
  /** Number of cells (table-row variant only). */
  columns?: number;
  /** How many copies of the variant to render (e.g. table rows). */
  count?: number;
  /** Pulse animation. Defaults to `true`. */
  animate?: boolean;
  className?: string;
}

function AvatarSkeleton({ animate }: { animate: boolean }) {
  return (
    <div className="space-y-3">
      <SkeletonAvatar size="lg" animate={animate} />
      <Skeleton animate={animate} className="h-3 w-24" />
    </div>
  );
}

/**
 * Ready-made skeleton layouts. For custom layouts compose the primitives in
 * `./Skeleton` (`Skeleton`, `SkeletonText`, `SkeletonAvatar`, ...).
 */
export function SkeletonLoader({
  variant = 'text',
  lines,
  columns = 4,
  count = 1,
  animate = true,
  className = '',
}: SkeletonLoaderProps) {
  const renderOne = (key: number) => {
    switch (variant) {
      case 'card':
        return (
          <SkeletonCardBlock
            key={key}
            lines={lines ?? 2}
            animate={animate}
          />
        );
      case 'avatar':
        return <AvatarSkeleton key={key} animate={animate} />;
      case 'table-row':
        return (
          <SkeletonTableRow key={key} columns={columns} animate={animate} />
        );
      case 'text':
      default:
        return <SkeletonText key={key} lines={lines ?? 3} animate={animate} />;
    }
  };

  const total = Math.max(1, count);

  return (
    <div
      className={total > 1 ? `space-y-3 ${className}` : className}
      aria-hidden="true"
    >
      {Array.from({ length: total }).map((_, index) => renderOne(index))}
    </div>
  );
}
