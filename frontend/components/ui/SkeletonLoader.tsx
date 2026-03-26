import React from 'react';

type SkeletonVariant = 'text' | 'card' | 'avatar' | 'table-row';

export interface SkeletonLoaderProps {
  variant?: SkeletonVariant;
  lines?: number;
  className?: string;
}

function TextSkeleton({ lines = 3 }: { lines: number }) {
  return (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={`line-${index}`}
          className={`h-3 rounded bg-neutral-200 ${
            index === lines - 1 ? 'w-2/3' : 'w-full'
          }`}
        />
      ))}
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="animate-pulse space-y-4 rounded-xl border border-neutral-200 bg-white p-4">
      <div className="h-40 rounded-lg bg-neutral-200" />
      <div className="h-5 w-2/3 rounded bg-neutral-200" />
      <TextSkeleton lines={2} />
    </div>
  );
}

function AvatarSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-14 w-14 rounded-full bg-neutral-200" />
      <div className="h-3 w-24 rounded bg-neutral-200" />
    </div>
  );
}

function TableRowSkeleton() {
  return (
    <div className="grid animate-pulse grid-cols-4 gap-3 rounded-lg border border-neutral-200 bg-white p-4">
      <div className="h-4 rounded bg-neutral-200" />
      <div className="h-4 rounded bg-neutral-200" />
      <div className="h-4 rounded bg-neutral-200" />
      <div className="h-4 rounded bg-neutral-200" />
    </div>
  );
}

export function SkeletonLoader({
  variant = 'text',
  lines = 3,
  className = '',
}: SkeletonLoaderProps) {
  return (
    <div className={className} aria-hidden="true">
      {variant === 'card' && <CardSkeleton />}
      {variant === 'avatar' && <AvatarSkeleton />}
      {variant === 'table-row' && <TableRowSkeleton />}
      {variant === 'text' && <TextSkeleton lines={lines} />}
    </div>
  );
}
