import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: (
    props: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
      children: React.ReactNode;
    },
  ) => React.createElement('a', props, props.children),
}));

import PaymentFormErrorBoundary from '../PaymentFormErrorBoundary';

function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error('Payment form crashed');
  }
  return <div>Payment form contents</div>;
}

function withSuppressedConsoleError<T>(fn: () => T): T {
  // eslint-disable-next-line no-console
  const originalError = console.error;
  console.error = () => {};
  try {
    return fn();
  } finally {
    console.error = originalError;
  }
}

describe('PaymentFormErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <PaymentFormErrorBoundary>
        <Bomb shouldThrow={false} />
      </PaymentFormErrorBoundary>,
    );

    expect(screen.getByText('Payment form contents')).toBeInTheDocument();
  });

  it('shows a retry-capable fallback instead of crashing when the form throws', () => {
    withSuppressedConsoleError(() => {
      render(
        <PaymentFormErrorBoundary>
          <Bomb shouldThrow={true} />
        </PaymentFormErrorBoundary>,
      );
    });

    expect(screen.getByText('Payment form failed to load')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('recovers and renders children again after retry is clicked', () => {
    // Gate the throw on an explicit flag rather than a render counter: React
    // retries a failed concurrent render synchronously, so a counter-based
    // component stops throwing on its own before the fallback ever shows.
    let shouldThrow = true;
    function FlakyForm() {
      if (shouldThrow) {
        throw new Error('Payment form crashed');
      }
      return <div>Payment form contents</div>;
    }

    withSuppressedConsoleError(() => {
      render(
        <PaymentFormErrorBoundary>
          <FlakyForm />
        </PaymentFormErrorBoundary>,
      );
    });

    expect(screen.getByText('Payment form failed to load')).toBeInTheDocument();

    // The underlying cause is resolved, so the retry should now succeed.
    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    expect(screen.getByText('Payment form contents')).toBeInTheDocument();
    expect(
      screen.queryByText('Payment form failed to load'),
    ).not.toBeInTheDocument();
  });
});
