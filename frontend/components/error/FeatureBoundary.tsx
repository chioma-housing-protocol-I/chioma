'use client';

import React from 'react';
import { classifyUnknownError, logError } from '@/lib/errors';

type Props = {
  children: React.ReactNode;
  /** Identifies this section in logs, e.g. "host-dashboard:kpi-listings". */
  name: string;
  /** Short label shown in the default fallback, e.g. "Active listings". */
  label?: string;
  fallback?: React.ReactNode;
};

type State = {
  error: Error | null;
};

/**
 * Compact, section-scoped error boundary for individual widgets/features
 * within a larger page (KPI cards, feed items, side panels, etc). Unlike
 * ClientErrorBoundary — which is meant to wrap an entire page and shows a
 * full-height fallback — this renders inline so one broken feature doesn't
 * take the rest of the page down with it.
 */
export class FeatureBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    const appError = classifyUnknownError(error, {
      source: `FeatureBoundary:${this.props.name}`,
    });
    logError(appError, appError.context);
  }

  private reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          role="alert"
          className="rounded-xl border border-red-300/50 bg-red-50/80 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
        >
          <p className="font-medium">
            {this.props.label
              ? `${this.props.label} is unavailable right now.`
              : "This section couldn't load."}
          </p>
          <button
            onClick={this.reset}
            className="mt-2 text-xs font-semibold underline underline-offset-2 hover:no-underline"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
