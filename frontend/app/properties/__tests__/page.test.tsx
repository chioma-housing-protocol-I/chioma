import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

const replace = vi.fn();
let searchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace, prefetch: vi.fn() }),
  useSearchParams: () => searchParams,
  usePathname: () => '/properties',
}));

vi.mock('@/hooks/useScrollRestoration', () => ({
  useScrollRestoration: vi.fn(),
}));

vi.mock('@/hooks/use-grid-columns', () => ({
  useGridColumns: () => 4,
}));

const useInfiniteProperties = vi.fn();

vi.mock('@/lib/query/hooks/use-properties', () => ({
  useInfiniteProperties: (...args: unknown[]) => useInfiniteProperties(...args),
}));

vi.mock('@/components/Navbar', () => ({
  default: () => <div data-testid="navbar" />,
}));

vi.mock('next/dynamic', () => ({
  default: () => () => <div data-testid="footer" />,
}));

import PropertyListing from '../page';

class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);
  root = null;
  rootMargin = '';
  thresholds = [];
}

describe('PropertyListing empty state wiring (#2198)', () => {
  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
    vi.clearAllMocks();
    replace.mockClear();
    searchParams = new URLSearchParams();
    useInfiniteProperties.mockReturnValue({
      data: { pages: [{ data: [], total: 0 }] },
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false,
      isError: false,
      error: null,
    });
  });

  it('renders the new empty state when there are no listings and no filters', () => {
    render(<PropertyListing />);

    expect(screen.getByTestId('property-empty-state')).toBeInTheDocument();
    expect(screen.getByText('No properties available yet')).toBeInTheDocument();
    expect(screen.queryByTestId('empty-state')).not.toBeInTheDocument();
  });

  it('renders the filter-aware empty state when filters are active', () => {
    searchParams = new URLSearchParams('q=lagos');
    render(<PropertyListing />);

    expect(screen.getByTestId('property-empty-state')).toBeInTheDocument();
    expect(
      screen.getByText('No properties match your filters'),
    ).toBeInTheDocument();
  });
});
