'use client';

import React from 'react';
import { CancelButton } from './CancelButton';
import { Badge } from './badge';

type CancellationState =
  { status: 'idle' } | { status: 'in-flight' } | { status: 'cancelled' };

export interface CancellableRequestProps {
  label: string;
  state: CancellationState;
  onCancel: () => void;
  showBadge?: boolean;
  children?: React.ReactNode;
}

export function CancellableRequest({
  label,
  state,
  onCancel,
  showBadge = true,
  children,
}: CancellableRequestProps) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {state.status === 'in-flight' && (
            <span
              className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-neutral-200 border-t-blue-600"
              aria-hidden="true"
            />
          )}
          {state.status === 'cancelled' && (
            <span
              className="inline-block h-4 w-4 rounded-full bg-neutral-100"
              aria-hidden="true"
            />
          )}
          <span className="text-sm font-medium text-neutral-900">{label}</span>
        </div>
        {showBadge && state.status === 'cancelled' && (
          <Badge variant="outline" className="text-xs">
            Cancelled
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        {state.status === 'in-flight' && (
          <CancelButton onCancel={onCancel} isInFlight={true} />
        )}
        {children}
      </div>
    </div>
  );
}
