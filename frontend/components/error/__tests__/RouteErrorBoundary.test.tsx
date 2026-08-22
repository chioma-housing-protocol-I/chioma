import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import RouteErrorBoundary from '@/components/error/RouteErrorBoundary';
import RouteLoading from '@/components/loading/RouteLoading';

// Regression coverage for issue #1549: every top-level route group must have
// its own error.tsx / loading.tsx so errors in one section (payments,
// agreements, disputes) show section-specific messaging instead of bubbling
// up to the generic root fallback. These tests lock in the behavior of the
// two shared templates used by those route-group files.

const renderError = (overrides: Record<string, unknown> = {}) =>
  render(
    <RouteErrorBoundary
      error={new Error('boom')}
      reset={() => {}}
      section="admin"
      label="Admin"
      homeHref="/admin"
      {...overrides}
    />,
  );

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('RouteErrorBoundary', () => {
  it('renders section-appropriate title and description', () => {
    vi.stubEnv('NODE_ENV', 'production');
    renderError();
    expect(screen.getByText('Admin area error')).toBeDefined();
    expect(screen.getByRole('alert')).toBeDefined();
  });

  it('renders a retry button that calls reset', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const reset = vi.fn();
    render(<RouteErrorBoundary error={new Error('x')} reset={reset} section="host" label="Host" homeHref="/host" />);
    const retry = screen.getByRole('button', { name: 'Retry' });
    fireEvent.click(retry);
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('links the "Go to safety" button to the section home', () => {
    vi.stubEnv('NODE_ENV', 'production');
    renderError();
    const link = screen.getByRole('link', { name: 'Go to safety' });
    expect(link.getAttribute('href')).toBe('/admin');
  });

  it('hides dev-only error detail outside development mode', () => {
    vi.stubEnv('NODE_ENV', 'production');
    renderError({ error: new Error('<img src=x onerror=alert(1)>') });
    expect(screen.queryByText('<img src=x onerror=alert(1)>')).toBeNull();
  });

  it('shows the raw message in development mode for debugging', () => {
    vi.stubEnv('NODE_ENV', 'development');
    renderError({ error: new Error('dev-only detail') });
    expect(screen.getByText('dev-only detail')).toBeDefined();
  });
});

describe('RouteLoading', () => {
  it('renders a busy live region with skeleton cards', () => {
    const { container } = render(<RouteLoading cards={2} />);
    expect(screen.getByLabelText('Page loading')).toBeDefined();
    expect(container.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0);
  });
});