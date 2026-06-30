'use client';

import React from 'react';
import { RefreshCw, AlertOctagon } from 'lucide-react';
import { useRetryState, useCircuitBreakerState } from '@/hooks/use-retry-state';

interface RetryStateIndicatorProps {
  endpoint?: string;
  showBreakerState?: boolean;
}

export function RetryStateIndicator({
  endpoint,
  showBreakerState = true,
}: RetryStateIndicatorProps) {
  const retryState = useRetryState();
  const breakerState = useCircuitBreakerState(endpoint ?? 'default');

  if (!retryState.isRetrying && breakerState === 'CLOSED') {
    return null;
  }

  return (
    <div className="flex flex-col gap-1">
      {retryState.isRetrying && (
        <div
          className="flex items-center gap-2 text-xs text-amber-600"
          role="status"
          aria-live="polite"
        >
          <RefreshCw size={14} className="animate-spin shrink-0" />
          <span>
            Retrying request to {retryState.currentEndpoint}... (attempt{' '}
            {retryState.currentAttempt} of {retryState.maxAttempts})
          </span>
        </div>
      )}

      {showBreakerState && breakerState !== 'CLOSED' && (
        <div
          className={`flex items-center gap-2 text-xs rounded-md px-2 py-1 ${
            breakerState === 'OPEN'
              ? 'bg-red-50 text-red-700'
              : 'bg-amber-50 text-amber-700'
          }`}
          role="status"
          aria-live="polite"
        >
          {breakerState === 'OPEN' ? (
            <AlertOctagon size={14} className="shrink-0" />
          ) : (
            <RefreshCw size={14} className="shrink-0" />
          )}
          <span>
            {breakerState === 'OPEN'
              ? 'Service temporarily unavailable — requests paused'
              : 'Service recovering — testing connection'}
          </span>
        </div>
      )}
    </div>
  );
}

export function RetryMetricsBadge() {
  const retryState = useRetryState();
  const metrics = Array.from(retryState.endpointMetrics.values());
  const totalRetries = metrics.reduce((sum, m) => sum + m.totalRetries, 0);
  const totalExhausted = metrics.reduce((sum, m) => sum + m.exhausted, 0);

  if (totalRetries === 0 && totalExhausted === 0) return null;

  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      {totalRetries > 0 && (
        <span className="flex items-center gap-1">
          <RefreshCw size={12} />
          {totalRetries} retries
        </span>
      )}
      {totalExhausted > 0 && (
        <span className="flex items-center gap-1 text-red-500">
          <AlertOctagon size={12} />
          {totalExhausted} failed
        </span>
      )}
    </div>
  );
}
