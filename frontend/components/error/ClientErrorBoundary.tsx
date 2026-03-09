'use client';

import React from 'react';
import ErrorFallback from './ErrorFallback';
import { classifyUnknownError, logError } from '@/lib/errors';

type Props = {
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackDescription?: string;
  source?: string;
};

type State = {
  error: Error | null;
};

export class ClientErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    const appError = classifyUnknownError(error, {
      source: this.props.source ?? 'ClientErrorBoundary',
    });
    logError(appError, appError.context);
  }

  private reset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <ErrorFallback
          title={this.props.fallbackTitle ?? 'Section failed to render'}
          description={
            this.props.fallbackDescription ??
            'This part of the page crashed. You can retry without leaving the page.'
          }
          error={this.state.error}
          retry={this.reset}
        />
      );
    }

    return this.props.children;
  }
}
