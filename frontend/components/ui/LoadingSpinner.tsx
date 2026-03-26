'use client';

import React from 'react';

type SpinnerVariant = 'primary' | 'neutral' | 'white';
type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg';

const sizeClassMap: Record<SpinnerSize, string> = {
  xs: 'h-3 w-3 border-2',
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-[3px]',
  lg: 'h-10 w-10 border-4',
};

const variantClassMap: Record<SpinnerVariant, string> = {
  primary: 'border-blue-200 border-t-blue-600',
  neutral: 'border-neutral-200 border-t-neutral-600',
  white: 'border-white/30 border-t-white',
};

export interface LoadingSpinnerProps {
  size?: SpinnerSize;
  variant?: SpinnerVariant;
  label?: string;
  fullScreen?: boolean;
  className?: string;
}

export function LoadingSpinner({
  size = 'md',
  variant = 'primary',
  label = 'Loading',
  fullScreen = false,
  className = '',
}: LoadingSpinnerProps) {
  const spinner = (
    <div
      className={`inline-flex items-center gap-2 ${className}`}
      role="status"
    >
      <span
        className={`${sizeClassMap[size]} ${variantClassMap[variant]} animate-spin rounded-full`}
        aria-hidden="true"
      />
      <span className="text-sm text-neutral-600">{label}</span>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-4 py-8">
        {spinner}
      </div>
    );
  }

  return spinner;
}
