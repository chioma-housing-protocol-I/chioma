import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: (
    props: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
      children: React.ReactNode;
    },
  ) => React.createElement('a', props, props.children),
}));

import ErrorFallback from '../ErrorFallback';
import { ClientErrorBoundary } from '../ClientErrorBoundary';

const XSS_PAYLOAD = '<img src=x onerror="window.__xss = true">';

function ThrowingChild(): React.ReactElement {
  throw new Error(XSS_PAYLOAD);
}

describe('ErrorFallback XSS prevention', () => {
  beforeEach(() => {
    // The error detail block only renders in development.
    vi.stubEnv('NODE_ENV', 'development');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('renders an error message containing HTML as literal text, not markup', () => {
    render(<ErrorFallback error={new Error(XSS_PAYLOAD)} />);

    const detail = screen.getByText(XSS_PAYLOAD);
    expect(detail.tagName).toBe('PRE');
    // No <img> should have been parsed out of the message.
    expect(detail.querySelector('img')).toBeNull();
    expect(document.querySelector('img')).toBeNull();
  });
});

describe('ClientErrorBoundary XSS prevention', () => {
  it('does not execute or render markup from a thrown error message', () => {
    delete (window as unknown as { __xss?: boolean }).__xss;

    // eslint-disable-next-line no-console
    const originalError = console.error;
    console.error = () => {};

    render(
      <ClientErrorBoundary>
        <ThrowingChild />
      </ClientErrorBoundary>,
    );

    console.error = originalError;

    expect(document.querySelector('img')).toBeNull();
    expect((window as unknown as { __xss?: boolean }).__xss).toBeUndefined();
  });
});
