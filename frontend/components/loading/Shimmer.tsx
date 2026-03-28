'use client';

import React from 'react';

export interface ShimmerProps {
  className?: string;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
}

const roundedMap = {
  none: 'rounded-none',
  sm: 'rounded',
  md: 'rounded-lg',
  lg: 'rounded-xl',
  full: 'rounded-full',
};

/**
 * Shimmer-style pulse block for list rows and placeholders.
 */
export function Shimmer({
  className = '',
  rounded = 'md',
}: ShimmerProps) {
  return (
    <div
      aria-hidden
      className={`animate-pulse bg-gradient-to-r from-neutral-200 via-neutral-100 to-neutral-200 ${roundedMap[rounded]} ${className}`}
    />
  );
}
