import { act, fireEvent, render, screen } from '@testing-library/react';
import type { CSSProperties, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  cardRenders: 0,
  adapterCalls: 0,
  shaped: new Map<number, { id: number; title: string }>(),
  queryParams: [] as unknown[],
  queryData: {
    pages: [{ data: [{ id: 1 }, { id: 2 }] }],
  },
  replace: vi.fn(),
}));

vi.mock('next/dynamic', () => ({
  default: () => () => <div data-testid="footer" />,
}));

let searchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParams,
  useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock('@/hooks/useScrollRestoration', () => ({
  useScrollRestoration: vi.fn(),
}));

vi.mock('@/hooks/use-grid-columns', () => ({
  useGridColumns: () => 1,
}));

vi.mock('@/components/Navbar', () => ({
  default: () => <div data-testid="navbar" />,
}));

vi.mock('@/components/properties/PropertyCardSkeleton', () => ({
  default: () => <div data-testid="skeleton" />,
}));

vi.mock('@/components/properties/PropertyListingHeader', () => ({
  PropertyListingHeader: () => <div data-testid="listing-header" />,
}));

vi.mock('@/components/properties/PropertyListEmptyState', () => ({
  PropertyListEmptyState: ({ hasFilters }: { hasFilters: boolean }) => (
    <div data-testid="property-empty-state">
      {hasFilters
        ? 'No properties match your filters'
        : 'No properties available yet'}
    </div>
  ),
}));

vi.mock('@/components/properties/LazyPropertyMapView', () => ({
  default: () => <div data-testid="map" />,
}));

vi.mock('@/components/properties/PropertyCard', async () => {
  const React = await import('react');
  const Card = React.memo(
    ({ property }: { property: { id: number; title: string } }) => {
      mocks.cardRenders += 1;
      return <div data-testid="property-card" data-id={property.id} />;
    },
  );
  Card.displayName = 'PropertyCardProbe';
  return { default: Card };
});

vi.mock('@/components/ui/VirtualGrid', () => ({
  VirtualGrid: ({
    items,
    renderItem,
    header,
    footer,
    style,
  }: {
    items: unknown[];
    renderItem: (item: never, index: number) => ReactNode;
    header: ReactNode;
    footer: ReactNode;
    style?: CSSProperties;
  }) => (
    <div data-testid="virtual-grid" style={style}>
      {header}
      {items.map((item, index) => (
        <div key={index}>{renderItem(item as never, index)}</div>
      ))}
      {footer}
    </div>
  ),
}));

vi.mock('@/lib/utils/property-adapter', () => ({
  toPropertyCardShape: (property: { id: number }) => {
    mocks.adapterCalls += 1;
    let shaped = mocks.shaped.get(property.id);
    if (!shaped) {
      shaped = { id: property.id, title: `Property ${property.id}` };
      mocks.shaped.set(property.id, shaped);
    }
    return shaped;
  },
}));

vi.mock('@/lib/query/hooks/use-properties', () => ({
  useInfiniteProperties: (params: unknown) => {
    mocks.queryParams.push(params);
    return {
      data: mocks.queryData,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false,
      isError: false,
      error: null,
    };
  },
}));

import PropertyListing from '../page';

beforeEach(() => {
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  Object.defineProperty(window, 'scrollY', {
    configurable: true,
    value: 0,
    writable: true,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('PropertyListing render stability', () => {
  beforeEach(() => {
    mocks.cardRenders = 0;
    mocks.adapterCalls = 0;
    mocks.shaped.clear();
    mocks.queryParams.length = 0;
    mocks.queryData.pages = [{ data: [{ id: 1 }, { id: 2 }] }];
    mocks.replace.mockClear();
    searchParams = new URLSearchParams();
  });

  it('keeps query params and card props stable across scroll state updates', () => {
    render(<PropertyListing />);

    expect(screen.getAllByTestId('property-card')).toHaveLength(2);

    const firstParams = mocks.queryParams.at(-1);
    const rendersAfterMount = mocks.cardRenders;
    const adapterCallsAfterMount = mocks.adapterCalls;

    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 25,
      writable: true,
    });
    act(() => {
      fireEvent.scroll(window);
    });

    expect(mocks.queryParams.at(-1)).toBe(firstParams);
    expect(mocks.adapterCalls).toBe(adapterCallsAfterMount);
    expect(mocks.cardRenders).toBe(rendersAfterMount);
  });
});

describe('PropertyListing empty state wiring (#2198)', () => {
  beforeEach(() => {
    mocks.queryData.pages = [{ data: [] }];
    searchParams = new URLSearchParams();
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
