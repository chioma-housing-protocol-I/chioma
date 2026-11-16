import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: (
    props: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
      children: React.ReactNode;
    },
  ) => React.createElement('a', props, props.children),
}));

import { ErrorBoundary } from '../ErrorBoundary';

function ThrowingChild(): React.ReactElement {
  throw new Error('Render failed');
}

describe('ErrorBoundary', () => {
  afterEach(() => {
    delete window.__CHIOMA_ERROR_REPORTER__;
    vi.restoreAllMocks();
  });

  it('shows fallback UI and reports caught render errors to monitoring', () => {
    const reporter = vi.fn();
    window.__CHIOMA_ERROR_REPORTER__ = reporter;
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary source="TestBoundary">
        <ThrowingChild />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(reporter).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Render failed',
        context: expect.objectContaining({ source: 'TestBoundary' }),
      }),
    );
  });
});