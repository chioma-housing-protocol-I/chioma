'use client';

import React from 'react';
import { Spinner } from './Spinner';

export interface LoadingOverlayProps {
  open: boolean;
  message?: string;
  className?: string;
}

/**
 * Full-viewport overlay: blocks interaction while work is in flight.
 */
export function LoadingOverlay({
  open,
  message = 'Loading…',
  className = '',
}: LoadingOverlayProps) {
  if (!open) return null;

  return (
    <div
      role="alert"
      aria-busy="true"
      aria-live="polite"
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-slate-900/60 backdrop-blur-sm ${className}`}
    >
        <Spinner size="lg" label={message} />
        {message ? (
          <p className="text-sm font-medium text-white drop-shadow">{message}</p>
        ) : null}
    </div>
  );
}
