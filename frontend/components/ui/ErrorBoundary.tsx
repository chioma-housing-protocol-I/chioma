'use client';

import React from 'react';
import ErrorFallback from '@/components/error/ErrorFallback';
import { classifyUnknownError, logError } from '@/lib/errors';

type UtilityErrorBoundaryProps = {
  children: React.ReactNode;
  title?: string;
  description?: string;
  source?: string;
};

type UtilityErrorBoundaryState = {
  error: Error | null;
};

export class ErrorBoundary extends React.Component<
  UtilityErrorBoundaryProps,
  UtilityErrorBoundaryState
> {
  state: UtilityErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): UtilityErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error) {
    const appError = classifyUnknownError(error, {
      source: this.props.source ?? 'UtilityErrorBoundary',
    });
    logError(appError, appError.context);
  }

  private handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <ErrorFallback
          title={this.props.title ?? 'Something went wrong'}
          description={
            this.props.description ??
            'This section failed to render. Retry to continue.'
          }
          error={this.state.error}
          retry={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}
