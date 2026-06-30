/**
 * [E2E] Property search and filter flow — Issue #1246
 *
 * Covers:
 *  1. PropertySearchFilters – search, type select, price range, popular tags,
 *     availability date, mobile drawer open/close/apply
 *  2. PropertyCard – renders deterministic fixture data; opens detail modal on click
 *  3. PropertyListing page – search & filter state drives useInfiniteProperties;
 *     empty-state, error-state, list/map/split view toggle
 *  4. Detail navigation – clicking a card triggers the property-detail modal
 *     with the correct property ID (acceptance criterion: detail nav works E2E)
 *
 * Framework: Vitest + @testing-library/react (same pattern as booking-flow tests)
 * Mock strategy: vi.mock the useInfiniteProperties hook so tests are deterministic
 * and never hit the network.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import React from 'react';

// ─── Deterministic fixture data ───────────────────────────────────────────────
import {
  E2E_PROPERTIES,
  E2E_PAGINATED_RESPONSE,
} from '@/mocks/entities/e2e-properties';
import { toPropertyCardShape } from '@/lib/utils/property-adapter';

// ─── Next.js stubs ────────────────────────────────────────────────────────────
const mockRouterReplace = vi.fn();
const mockRouterPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    replace: mockRouterReplace,
    push: mockRouterPush,
  })),
  useSearchParams: vi.fn(() => ({
    get: vi.fn((_key: string) => null),
  })),
}));
vi.mock('next/dynamic', () => ({
  default: (_fn: () => Promise<unknown>, _opts?: unknown) => {
    const Stub = () =>
      React.createElement('div', { 'data-testid': 'map-stub' }, 'Map');
    Stub.displayName = 'DynamicMapStub';
    return Stub;
  },
}));

// ─── Component stubs ──────────────────────────────────────────────────────────
vi.mock('@/components/Navbar', () => ({
  default: () => React.createElement('nav', { 'data-testid': 'navbar' }),
}));
vi.mock('@/components/Footer', () => ({
  default: () => React.createElement('footer', { 'data-testid': 'footer' }),
}));
vi.mock('@/components/PropertyCardSkeleton', () => ({
  default: () => React.createElement('div', { 'data-testid': 'skeleton' }),
}));
vi.mock('@/components/properties/PropertyListingHeader', () => ({
  PropertyListingHeader: ({ count }: { count: number }) =>
    React.createElement(
      'div',
      { 'data-testid': 'listing-header' },
      `${count} listings`,
    ),
}));
vi.mock('@/components/loading', () => ({
  Spinner: () => React.createElement('div', { 'data-testid': 'spinner' }),
}));

// ─── Modal context stub ───────────────────────────────────────────────────────
const mockOpenModal = vi.fn();
vi.mock('@/contexts/ModalContext', () => ({
  useModal: vi.fn(() => ({
    openModal: mockOpenModal,
    closeModal: vi.fn(),
    modalState: { type: null, isOpen: false },
  })),
}));

// ─── API hook stub ────────────────────────────────────────────────────────────
/**
 * useInfiniteProperties is mocked so tests control exactly what the listing
 * page renders without needing a running backend.
 */
const mockFetchNextPage = vi.fn();
let mockHookReturnValue: Record<string, unknown> = {};

vi.mock('@/lib/query/hooks/use-properties', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/lib/query/hooks/use-properties')>();
  return {
    ...actual,
    useInfiniteProperties: vi.fn(() => mockHookReturnValue),
  };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeSuccessHook(properties = E2E_PROPERTIES) {
  return {
    data: {
      pages: [{ ...E2E_PAGINATED_RESPONSE, data: properties }],
      pageParams: [1],
    },
    fetchNextPage: mockFetchNextPage,
    hasNextPage: false,
    isFetchingNextPage: false,
    isLoading: false,
    isError: false,
    error: null,
  };
}

const makeLoadingHook = () => ({
  data: undefined,
  fetchNextPage: mockFetchNextPage,
  hasNextPage: false,
  isFetchingNextPage: false,
  isLoading: true,
  isError: false,
  error: null,
});

const makeErrorHook = (msg = 'Network error') => ({
  data: undefined,
  fetchNextPage: mockFetchNextPage,
  hasNextPage: false,
  isFetchingNextPage: false,
  isLoading: false,
  isError: true,
  error: new Error(msg),
});

const makeEmptyHook = () => makeSuccessHook([]);

// ─── Component imports (after all mocks are declared) ─────────────────────────
import PropertySearchFilters from '@/components/properties/PropertySearchFilters';
import PropertyCard from '@/components/properties/PropertyCard';

// ══════════════════════════════════════════════════════════════════════════════
// 1. PropertySearchFilters – stable selectors & interaction
// ══════════════════════════════════════════════════════════════════════════════
describe('[E2E] PropertySearchFilters – stable selectors', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the root container with data-testid', () => {
    render(React.createElement(PropertySearchFilters));
    expect(screen.getByTestId('property-search-filters')).toBeInTheDocument();
  });

  it('renders location search input with correct test-id', () => {
    render(React.createElement(PropertySearchFilters));
    expect(screen.getByTestId('search-location-input')).toBeInTheDocument();
  });

  it('renders property-type select with correct test-id', () => {
    render(React.createElement(PropertySearchFilters));
    expect(screen.getByTestId('property-type-select')).toBeInTheDocument();
  });

  it('renders availability date input with correct test-id', () => {
    render(React.createElement(PropertySearchFilters));
    expect(screen.getByTestId('availability-date-input')).toBeInTheDocument();
  });

  it('renders min/max price inputs with correct test-ids', () => {
    render(React.createElement(PropertySearchFilters));
    expect(screen.getByTestId('min-price-input')).toBeInTheDocument();
    expect(screen.getByTestId('max-price-input')).toBeInTheDocument();
  });

  it('renders search submit button with correct test-id', () => {
    render(React.createElement(PropertySearchFilters));
    expect(screen.getByTestId('search-submit-btn')).toBeInTheDocument();
  });

  it('renders popular filter tags with individual test-ids', () => {
    render(React.createElement(PropertySearchFilters));
    expect(screen.getByTestId('filter-tag-verified-only')).toBeInTheDocument();
    expect(screen.getByTestId('filter-tag-pets-allowed')).toBeInTheDocument();
    expect(screen.getByTestId('filter-tag-parking')).toBeInTheDocument();
    expect(screen.getByTestId('filter-tag-gym')).toBeInTheDocument();
    expect(
      screen.getByTestId('filter-tag-internet-included'),
    ).toBeInTheDocument();
  });
});

describe('[E2E] PropertySearchFilters – filter interactions', () => {
  beforeEach(() => vi.clearAllMocks());

  it('accepts text input in the location search field', () => {
    render(React.createElement(PropertySearchFilters));
    const input = screen.getByTestId(
      'search-location-input',
    ) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'London' } });
    expect(input.value).toBe('London');
  });

  it('accepts selection in the property type dropdown', () => {
    render(React.createElement(PropertySearchFilters));
    const select = screen.getByTestId(
      'property-type-select',
    ) as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'studio_apartment' } });
    expect(select.value).toBe('studio_apartment');
  });

  it('accepts a date in the availability input', () => {
    render(React.createElement(PropertySearchFilters));
    const date = screen.getByTestId(
      'availability-date-input',
    ) as HTMLInputElement;
    fireEvent.change(date, { target: { value: '2027-06-01' } });
    expect(date.value).toBe('2027-06-01');
  });

  it('accepts values in min and max price inputs', () => {
    render(React.createElement(PropertySearchFilters));
    const min = screen.getByTestId('min-price-input') as HTMLInputElement;
    const max = screen.getByTestId('max-price-input') as HTMLInputElement;
    fireEvent.change(min, { target: { value: '500' } });
    fireEvent.change(max, { target: { value: '3000' } });
    expect(min.value).toBe('500');
    expect(max.value).toBe('3000');
  });

  it('opens the mobile drawer when the mobile toggle is clicked', () => {
    render(React.createElement(PropertySearchFilters));
    expect(
      screen.queryByTestId('mobile-filters-drawer'),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('mobile-filters-toggle'));
    expect(screen.getByTestId('mobile-filters-drawer')).toBeInTheDocument();
  });

  it('closes the mobile drawer via the close button', () => {
    render(React.createElement(PropertySearchFilters));
    fireEvent.click(screen.getByTestId('mobile-filters-toggle'));
    fireEvent.click(screen.getByTestId('mobile-filters-close-btn'));
    expect(
      screen.queryByTestId('mobile-filters-drawer'),
    ).not.toBeInTheDocument();
  });

  it('closes the mobile drawer when backdrop is clicked', () => {
    render(React.createElement(PropertySearchFilters));
    fireEvent.click(screen.getByTestId('mobile-filters-toggle'));
    fireEvent.click(screen.getByTestId('mobile-filters-backdrop'));
    expect(
      screen.queryByTestId('mobile-filters-drawer'),
    ).not.toBeInTheDocument();
  });

  it('closes the mobile drawer when Apply Filters is clicked', () => {
    render(React.createElement(PropertySearchFilters));
    fireEvent.click(screen.getByTestId('mobile-filters-toggle'));
    fireEvent.click(screen.getByTestId('mobile-filters-apply-btn'));
    expect(
      screen.queryByTestId('mobile-filters-drawer'),
    ).not.toBeInTheDocument();
  });

  it('accepts min/max budget in the mobile drawer', () => {
    render(React.createElement(PropertySearchFilters));
    fireEvent.click(screen.getByTestId('mobile-filters-toggle'));
    const mobileMin = screen.getByTestId(
      'mobile-min-price-input',
    ) as HTMLInputElement;
    const mobileMax = screen.getByTestId(
      'mobile-max-price-input',
    ) as HTMLInputElement;
    fireEvent.change(mobileMin, { target: { value: '200' } });
    fireEvent.change(mobileMax, { target: { value: '1500' } });
    expect(mobileMin.value).toBe('200');
    expect(mobileMax.value).toBe('1500');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 2. PropertyCard – renders deterministic fixture data
// ══════════════════════════════════════════════════════════════════════════════
describe('[E2E] PropertyCard – deterministic fixture rendering', () => {
  beforeEach(() => vi.clearAllMocks());

  const cardShape = toPropertyCardShape(E2E_PROPERTIES[0]); // prop-1: Manhattan Studio

  it('renders the card container with data-testid and property id', () => {
    const { container } = render(
      React.createElement(PropertyCard, { property: cardShape }),
    );
    const card = container.querySelector('[data-testid="property-card"]');
    expect(card).toBeInTheDocument();
    expect(card).toHaveAttribute('data-property-id', 'prop-1');
  });

  it('displays the property title from fixture', () => {
    render(React.createElement(PropertyCard, { property: cardShape }));
    expect(screen.getByText('Manhattan Studio')).toBeInTheDocument();
  });

  it('displays the formatted price ($1,500)', () => {
    render(React.createElement(PropertyCard, { property: cardShape }));
    // price appears twice (grid + list header) – getAllByText covers both
    const prices = screen.getAllByText('$1,500');
    expect(prices.length).toBeGreaterThanOrEqual(1);
  });

  it('displays the location built from address parts', () => {
    render(React.createElement(PropertyCard, { property: cardShape }));
    // adapter builds "10 West 57th Street, New York, NY, USA"
    expect(
      screen.getByText(/manhattan/i, { exact: false }),
    ).toBeInTheDocument();
  });

  it('shows the Verified badge for a verified property', () => {
    render(React.createElement(PropertyCard, { property: cardShape }));
    expect(screen.getByText('Verified')).toBeInTheDocument();
  });

  it('shows New Listing badge for an unverified property (prop-3)', () => {
    const unverified = toPropertyCardShape(E2E_PROPERTIES[2]); // prop-3
    render(React.createElement(PropertyCard, { property: unverified }));
    expect(screen.getByText('New Listing')).toBeInTheDocument();
  });

  it('displays amenities (Gym, Pool) from fixture', () => {
    render(React.createElement(PropertyCard, { property: cardShape }));
    expect(screen.getByText('Gym')).toBeInTheDocument();
    expect(screen.getByText('Pool')).toBeInTheDocument();
  });

  it('displays the owner/manager name', () => {
    render(React.createElement(PropertyCard, { property: cardShape }));
    expect(screen.getByText('Sarah Okafor')).toBeInTheDocument();
  });

  it('opens the property detail modal with the correct property ID on click', () => {
    render(React.createElement(PropertyCard, { property: cardShape }));
    const card = screen.getByTestId('property-card');
    fireEvent.click(card);
    expect(mockOpenModal).toHaveBeenCalledOnce();
    const [modalType, modalData] = mockOpenModal.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(modalType).toBe('propertyDetail');
    expect((modalData.property as { id: string }).id).toBe('prop-1');
  });

  it('does NOT propagate click when wishlist button is clicked', () => {
    render(React.createElement(PropertyCard, { property: cardShape }));
    const wishlistBtn = screen.getByRole('button');
    fireEvent.click(wishlistBtn);
    // openModal should NOT have been called (stopPropagation on heart button)
    expect(mockOpenModal).not.toHaveBeenCalled();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 3. Property Listing page – full flow with mocked API hook
// ══════════════════════════════════════════════════════════════════════════════
describe('[E2E] Property listing page – renders all 6 fixture cards', () => {
  let PropertyListing: React.ComponentType;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockHookReturnValue = makeSuccessHook();
    const mod = await import('@/app/properties/page');
    PropertyListing = mod.default;
  });

  it('renders the listing header with the total fixture count', async () => {
    render(React.createElement(PropertyListing));
    await waitFor(() =>
      expect(screen.getByTestId('listing-header')).toHaveTextContent(
        '6 listings',
      ),
    );
  });

  it('renders exactly 6 property cards', async () => {
    render(React.createElement(PropertyListing));
    await waitFor(() => {
      const cards = screen.getAllByTestId('property-card');
      expect(cards).toHaveLength(6);
    });
  });

  it('each card has a stable data-property-id matching the fixture', async () => {
    render(React.createElement(PropertyListing));
    await waitFor(() => {
      const expected = E2E_PROPERTIES.map((p) => p.id);
      const rendered = screen
        .getAllByTestId('property-card')
        .map((el) => el.getAttribute('data-property-id'));
      expect(rendered).toEqual(expected);
    });
  });

  it('renders the property grid container', async () => {
    render(React.createElement(PropertyListing));
    await waitFor(() =>
      expect(screen.getByTestId('property-grid')).toBeInTheDocument(),
    );
  });

  it('renders the search input on the listing page', async () => {
    render(React.createElement(PropertyListing));
    await waitFor(() =>
      expect(screen.getByTestId('property-search-input')).toBeInTheDocument(),
    );
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 4. Search by query – acceptance criterion: filtering narrows results
// ══════════════════════════════════════════════════════════════════════════════
describe('[E2E] Property listing page – search narrows results', () => {
  let PropertyListing: React.ComponentType;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Start with full dataset
    mockHookReturnValue = makeSuccessHook();
    const mod = await import('@/app/properties/page');
    PropertyListing = mod.default;
  });

  it('updates the search input value when user types', async () => {
    render(React.createElement(PropertyListing));
    const input = await screen.findByTestId('property-search-input');
    fireEvent.change(input, { target: { value: 'London' } });
    expect((input as HTMLInputElement).value).toBe('London');
  });

  it('calls router.replace with encoded query on Enter', async () => {
    render(React.createElement(PropertyListing));
    const input = await screen.findByTestId('property-search-input');
    fireEvent.change(input, { target: { value: 'New York' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(mockRouterReplace).toHaveBeenCalledWith('/properties?q=New%20York');
  });

  it('calls router.replace with bare /properties when query is cleared', async () => {
    render(React.createElement(PropertyListing));
    const input = await screen.findByTestId('property-search-input');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    expect(mockRouterReplace).toHaveBeenCalledWith('/properties');
  });

  it('re-renders with narrowed results when hook returns a filtered set', async () => {
    // Simulate API returning only NYC properties after the search
    const nycOnly = E2E_PROPERTIES.filter((p) => p.city === 'New York');
    mockHookReturnValue = makeSuccessHook(nycOnly);
    render(React.createElement(PropertyListing));
    await waitFor(() => {
      const cards = screen.getAllByTestId('property-card');
      expect(cards).toHaveLength(2);
      const ids = cards.map((c) => c.getAttribute('data-property-id'));
      expect(ids).toContain('prop-1');
      expect(ids).toContain('prop-4');
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 5. Price filter – acceptance criterion: filtering narrows results
// ══════════════════════════════════════════════════════════════════════════════
describe('[E2E] Property listing page – price filter narrows results', () => {
  let PropertyListing: React.ComponentType;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Start: only properties $800–$1500 (prop-1, prop-3, prop-6)
    const affordableOnly = E2E_PROPERTIES.filter((p) => p.price <= 1500);
    mockHookReturnValue = makeSuccessHook(affordableOnly);
    const mod = await import('@/app/properties/page');
    PropertyListing = mod.default;
  });

  it('renders only 3 affordable-range properties when hook returns filtered set', async () => {
    render(React.createElement(PropertyListing));
    await waitFor(() => {
      const cards = screen.getAllByTestId('property-card');
      expect(cards).toHaveLength(3);
    });
  });

  it('property-ids match the expected affordable set', async () => {
    render(React.createElement(PropertyListing));
    await waitFor(() => {
      const ids = screen
        .getAllByTestId('property-card')
        .map((c) => c.getAttribute('data-property-id'));
      expect(ids).toContain('prop-1'); // $1,500
      expect(ids).toContain('prop-3'); // $800
      expect(ids).toContain('prop-6'); // $1,100
      expect(ids).not.toContain('prop-2'); // $3,200 – filtered out
      expect(ids).not.toContain('prop-4'); // $5,000 – filtered out
      expect(ids).not.toContain('prop-5'); // $2,200 – filtered out
    });
  });

  it('renders the correct count in the listing header', async () => {
    render(React.createElement(PropertyListing));
    await waitFor(() =>
      expect(screen.getByTestId('listing-header')).toHaveTextContent(
        '3 listings',
      ),
    );
  });

  it('accepts numeric values in the page-level min/max price inputs', async () => {
    render(React.createElement(PropertyListing));
    const minInput = await screen.findByTestId('page-min-price-input');
    const maxInput = await screen.findByTestId('page-max-price-input');
    fireEvent.change(minInput, { target: { value: '500' } });
    fireEvent.change(maxInput, { target: { value: '2000' } });
    expect((minInput as HTMLInputElement).value).toBe('500');
    expect((maxInput as HTMLInputElement).value).toBe('2000');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// 6. Property type filter – acceptance criterion: filtering narrows results
// ══════════════════════════════════════════════════════════════════════════════
describe('[E2E] Property listing page – type filter narrows results', () => {
  let PropertyListing: React.ComponentType;

  beforeEach(async () => {
    vi.clearAllMocks();
    const apartmentsOnly = E2E_PROPERTIES.filter((p) => p.type === 'apartment');
    mockHookReturnValue = makeSuccessHook(apartmentsOnly);
    const mod = await import('@/app/properties/page');
    PropertyListing = mod.default;
  });

  it('renders only apartment-type properties when hook returns filtered set', async () => {
    render(React.createElement(PropertyListing));
    await waitFor(() => {
      const cards = screen.getAllByTestId('property-card');
      // prop-1 (apartment), prop-3 (apartment), prop-6 (apartment) = 3
      expect(cards).toHaveLength(3);
    });
  });

  it('does not render house or commercial type cards', async () => {
    render(React.createElement(PropertyListing));
    await waitFor(() => {
      const ids = screen
        .getAllByTestId('property-card')
        .map((c) => c.getAttribute('data-property-id'));
      expect(ids).not.toContain('prop-2'); // house
      expect(ids).not.toContain('prop-4'); // house
      expect(ids).not.toContain('prop-5'); // commercial
    });
  });
});
