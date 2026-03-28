'use client';

import React from 'react';

export interface ProgressBarProps {
  /** 0–100 when not indeterminate */
  value?: number;
  indeterminate?: boolean;
  className?: string;
  barClassName?: string;
}

/**
 * Determinate or indeterminate progress bar for long operations.
 */
export function ProgressBar({
  value = 0,
  indeterminate = false,
  className = '',
  barClassName = '',
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  if (indeterminate) {
    return (
      <div
        role="progressbar"
        aria-busy="true"
        aria-label="Loading"
        className={`h-2 w-full overflow-hidden rounded-full bg-neutral-200 ${className}`}
      >
        <div
          className={`h-full w-full animate-pulse rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 ${barClassName}`}
        />
      </div>
    );
  }

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      aria-label="Progress"
      className={`h-2 w-full overflow-hidden rounded-full bg-neutral-200 ${className}`}
    >
      <div
        className={`h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-[width] duration-300 ease-out ${barClassName}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
