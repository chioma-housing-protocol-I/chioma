'use client';

import React, { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Spinner } from './Spinner';

export interface LoadingButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  children: ReactNode;
  spinnerPosition?: 'start' | 'end';
}

/**
 * Disables the button and shows a spinner while `loading` is true.
 */
export function LoadingButton({
  loading = false,
  disabled,
  children,
  className = '',
  spinnerPosition = 'start',
  type = 'button',
  ...rest
}: LoadingButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading}
      className={`inline-flex items-center justify-center gap-2 ${className}`}
      {...rest}
    >
      {loading && spinnerPosition === 'start' ? (
        <Spinner size="sm" decorative />
      ) : null}
      <span className={loading ? 'opacity-90' : undefined}>{children}</span>
      {loading && spinnerPosition === 'end' ? (
        <Spinner size="sm" decorative />
      ) : null}
    </button>
  );
}
