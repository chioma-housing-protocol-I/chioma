import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  PrefetchLink,
  PREFETCH_INTENT_DELAY_MS,
} from '@/components/navigation/PrefetchLink';

const prefetchDetailByKind = vi.fn(() => Promise.resolve());

vi.mock('@/lib/query/prefetch', () => ({
  prefetchDetailByKind: (...args: unknown[]) => prefetchDetailByKind(...args),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    prefetch,
    ...rest
  }: {
    children: React.ReactNode;
    href: string;
    prefetch?: boolean;
    [key: string]: unknown;
  }) => (
    <a href={href} data-prefetch={String(prefetch)} {...rest}>
      {children}
    </a>
  ),
}));

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient();
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

describe('PrefetchLink', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    prefetchDetailByKind.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('defaults Next.js route prefetch to false to avoid list over-fetching', () => {
    renderWithClient(
      <PrefetchLink href="/properties/1" prefetchKind="property" prefetchId="1">
        View
      </PrefetchLink>,
    );
    expect(screen.getByRole('link')).toHaveAttribute('data-prefetch', 'false');
  });

  it('prefetches detail data after hover intent delay', () => {
    renderWithClient(
      <PrefetchLink href="/properties/1" prefetchKind="property" prefetchId="1">
        View
      </PrefetchLink>,
    );

    fireEvent.mouseEnter(screen.getByRole('link'));
    expect(prefetchDetailByKind).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(PREFETCH_INTENT_DELAY_MS);
    });

    expect(prefetchDetailByKind).toHaveBeenCalledTimes(1);
    expect(prefetchDetailByKind.mock.calls[0][1]).toBe('property');
    expect(prefetchDetailByKind.mock.calls[0][2]).toBe('1');
  });

  it('cancels prefetch when pointer leaves before intent delay', () => {
    renderWithClient(
      <PrefetchLink href="/properties/1" prefetchKind="property" prefetchId="1">
        View
      </PrefetchLink>,
    );

    const link = screen.getByRole('link');
    fireEvent.mouseEnter(link);
    fireEvent.mouseLeave(link);
    act(() => {
      vi.advanceTimersByTime(PREFETCH_INTENT_DELAY_MS + 50);
    });

    expect(prefetchDetailByKind).not.toHaveBeenCalled();
  });
});
