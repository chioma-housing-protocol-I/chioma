import { describe, it, expect, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import ErrorFallback from '@/components/error/ErrorFallback';

// Regression coverage for issue #1424 ("XSS Vulnerability in Error Display
// Components"): the dev-only error detail (`error.message`) is rendered via
// plain JSX text interpolation ({error.message}) inside a <pre>, which React
// auto-escapes — never dangerouslySetInnerHTML or a raw DOM API. These tests
// lock that in so a future refactor can't silently reintroduce an actual
// injection path.

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('ErrorFallback', () => {
  it('renders the description as plain text', () => {
    render(<ErrorFallback description="A safe description" />);
    expect(screen.getByText('A safe description')).toBeDefined();
  });

  it('renders a malicious error message as inert text in development mode', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const payload = '<img src=x onerror=alert(1)>';
    const { container } = render(
      <ErrorFallback error={new Error(payload)} />,
    );

    expect(screen.getByText(payload)).toBeDefined();
    expect(container.querySelector('img')).toBeNull();
  });

  it('renders a script-tag payload as inert text, not an executable script', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const payload = '<script>alert(document.cookie)</script>';
    const { container } = render(
      <ErrorFallback error={new Error(payload)} />,
    );

    expect(screen.getByText(payload)).toBeDefined();
    expect(container.querySelector('script')).toBeNull();
  });

  it('does not render error details outside development mode', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const payload = '<img src=x onerror=alert(1)>';
    render(<ErrorFallback error={new Error(payload)} />);

    expect(screen.queryByText(payload)).toBeNull();
  });
});
