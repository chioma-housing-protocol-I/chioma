'use client';

import React from 'react';

export type SpinnerSize = 'sm' | 'md' | 'lg';

const sizeClasses: Record<SpinnerSize, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-[3px]',
};

export interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
  label?: string;
  /** Hide from assistive tech (e.g. inside a button that already has aria-busy). */
  decorative?: boolean;
}

/**
 * Accessible inline spinner (use inside buttons, cards, overlays).
 */
export function Spinner({
  size = 'md',
  className = '',
  label = 'Loading',
  decorative = false,
}: SpinnerProps) {
  return (
    <span
      role={decorative ? 'presentation' : 'status'}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : label}
      className={`inline-flex shrink-0 ${className}`}
    >
      <span
        className={`animate-spin rounded-full border-neutral-200 border-t-brand-blue ${sizeClasses[size]}`}
      />
      {!decorative && label ? (
        <span className="sr-only">{label}</span>
      ) : null}
    </span>
  );
}
