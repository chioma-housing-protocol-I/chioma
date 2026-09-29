import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ErrorToast } from '@/components/error/ErrorToast';
import type { GlobalError } from '@/store/errorStore';

// Regression coverage for issue #1424 ("XSS Vulnerability in Error Display
// Components"): error.message is rendered via plain JSX text interpolation
// ({error.message}), which React auto-escapes — it is never passed through
// dangerouslySetInnerHTML or a raw DOM API. These tests lock that in so a
// future refactor can't silently reintroduce an actual injection path.

function makeError(overrides: Partial<GlobalError> = {}): GlobalError {
  return {
    id: 'err-1',
    message: 'Something went wrong',
    category: 'unknown',
    severity: 'error',
    timestamp: Date.now(),
    ...overrides,
  };
}

describe('ErrorToast', () => {
  it('renders a plain error message as text', () => {
    render(<ErrorToast error={makeError()} onRemove={vi.fn()} />);
    expect(screen.getByText('Something went wrong')).toBeDefined();
  });

  it('renders a malicious error message as inert text, not markup', () => {
    const payload = '<img src=x onerror=alert(1)>';
    const { container } = render(
      <ErrorToast error={makeError({ message: payload })} onRemove={vi.fn()} />,
    );

    // The payload must appear as literal text content...
    expect(screen.getByText(payload)).toBeDefined();
    // ...and must never have been parsed into a real <img> element.
    expect(container.querySelector('img')).toBeNull();
  });

  it('renders a script-tag payload as inert text, not an executable script', () => {
    const payload = '<script>alert(document.cookie)</script>';
    const { container } = render(
      <ErrorToast error={makeError({ message: payload })} onRemove={vi.fn()} />,
    );

    expect(screen.getByText(payload)).toBeDefined();
    expect(container.querySelector('script')).toBeNull();
  });
});
