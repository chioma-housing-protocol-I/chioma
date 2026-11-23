import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the API client
vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import { apiClient } from '@/lib/api-client';
import PropertySearchFilters from '@/components/properties/PropertySearchFilters';
import FilterSidebar from '@/components/properties/FilterSidebar';
import PropertyCard from '@/components/properties/PropertyCard';
import { useProperties } from '@/lib/query/hooks/use-properties';
import { usePropertyStore } from '@/store/property-store';
import { useAuthStore } from '@/store/authStore';
import { toPropertyCardShape } from '@/lib/utils/property-adapter';
import type { Property, PaginatedResponse } from '@/types';

const mockedApiClient = vi.mocked(apiClient);

// Sample mock properties
const mockPropertyList: Property[] = [
  {
    id: 'prop-1',
    title: 'Sunny Beachfront Villa',
    description: 'Beautiful villa overlooking the ocean',
    address: '101 Ocean Drive',
    city: 'Miami',
    state: 'FL',
    country: 'USA',
    price: 3500,
    bedrooms: 3,
    bathrooms: 2,
    area: 2000,
    type: 'house',
    status: 'published',
    images: [{ id: 'img-1', url: 'https://example.com/villa.jpg', isPrimary: true, order: 0 }],
    amenities: [{ id: 'am-1', name: 'Pool' }, { id: 'am-2', name: 'Parking' }],
    ownerId: 'owner-1',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    petsAllowed: true,
    hasParking: true,
  },
  {
    id: 'prop-2',
    title: 'Downtown Modern Loft',
    description: 'Chic loft in city center',
    address: '202 Broadway St',
    city: 'New York',
    state: 'NY',
    country: 'USA',
    price: 2200,
    bedrooms: 1,
    bathrooms: 1,
    area: 850,
    type: 'apartment',
    status: 'published',
    images: [{ id: 'img-2', url: 'https://example.com/loft.jpg', isPrimary: true, order: 0 }],
    amenities: [{ id: 'am-3', name: 'Gym' }, { id: 'am-4', name: 'WiFi' }],
    ownerId: 'owner-2',
    createdAt: '2026-01-02T00:00:00Z',
    updatedAt: '2026-01-02T00:00:00Z',
    petsAllowed: false,
    hasParking: false,
  },
  {
    id: 'prop-3',
    title: 'Suburban Family Home',
    description: 'Spacious home with huge yard',
    address: '303 Maple Ave',
    city: 'Austin',
    state: 'TX',
    country: 'USA',
    price: 1800,
    bedrooms: 4,
    bathrooms: 3,
    area: 2500,
    type: 'house',
    status: 'published',
    images: [{ id: 'img-3', url: 'https://example.com/suburban.jpg', isPrimary: true, order: 0 }],
    amenities: [{ id: 'am-5', name: 'Garden' }],
    ownerId: 'owner-3',
    createdAt: '2026-01-03T00:00:00Z',
    updatedAt: '2026-01-03T00:00:00Z',
    petsAllowed: true,
    hasParking: true,
  },
];

const mockPaginatedResponse: PaginatedResponse<Property> = {
  data: mockPropertyList,
  total: 3,
  page: 1,
  limit: 10,
  totalPages: 1,
};

// Test wrapper component connecting PropertySearchFilters with useProperties hook & rendering
function FilteredPropertyList() {
  const { searchQuery, filters } = usePropertyStore();

  const queryParams = {
    search: searchQuery || undefined,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    type: filters.propertyType,
    petsAllowed: filters.petsAllowed,
    hasParking: filters.hasParking,
  };

  const { data, isLoading, isError } = useProperties(queryParams);

  return (
    <div>
      <PropertySearchFilters />
      <div data-testid="results-section">
        {isLoading && <p>Loading properties...</p>}
        {isError && <p>Error loading properties</p>}
        {data?.data && (
          <div data-testid="property-grid">
            <span data-testid="results-count">{data.data.length} listings</span>
            {data.data.map((prop) => (
              <PropertyCard
                key={prop.id}
                property={toPropertyCardShape(prop)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

describe('PropertyFilters Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePropertyStore.getState().resetFilters();
    useAuthStore.setState({ isAuthenticated: false });

    // Default mock response
    mockedApiClient.get.mockImplementation(async (url: string) => {
      if (url.startsWith('/search/suggest')) {
        return { data: ['Miami Beach', 'Miami Downtown'], status: 200 };
      }
      return { data: mockPaginatedResponse, status: 200 };
    });
  });

  it('renders initial properties with default unconstrained query parameters', async () => {
    renderWithClient(<FilteredPropertyList />);

    await waitFor(() => {
      expect(screen.getByText('Sunny Beachfront Villa')).toBeInTheDocument();
      expect(screen.getByText('Downtown Modern Loft')).toBeInTheDocument();
      expect(screen.getByText('Suburban Family Home')).toBeInTheDocument();
    });

    // Check that apiClient.get was called with the properties endpoint
    expect(mockedApiClient.get).toHaveBeenCalledWith(
      expect.stringMatching(/^\/properties/),
    );
  });

  it('applies text search and requests API with query param', async () => {
    const filteredMiami: PaginatedResponse<Property> = {
      data: [mockPropertyList[0]],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    };

    mockedApiClient.get.mockImplementation(async (url: string) => {
      if (url.includes('search=Miami')) {
        return { data: filteredMiami, status: 200 };
      }
      return { data: mockPaginatedResponse, status: 200 };
    });

    renderWithClient(<FilteredPropertyList />);

    const searchInput = screen.getByTestId('search-location-input');
    fireEvent.change(searchInput, { target: { value: 'Miami' } });

    // Submit search form
    const submitBtn = screen.getByTestId('search-submit-btn');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockedApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('search=Miami'),
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Sunny Beachfront Villa')).toBeInTheDocument();
      expect(screen.queryByText('Downtown Modern Loft')).not.toBeInTheDocument();
    });
  });

  it('applies min and max price budget filter and triggers API with updated parameters', async () => {
    const filteredPrice: PaginatedResponse<Property> = {
      data: [mockPropertyList[1]],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    };

    mockedApiClient.get.mockImplementation(async (url: string) => {
      if (url.includes('minPrice=2000') && url.includes('maxPrice=3000')) {
        return { data: filteredPrice, status: 200 };
      }
      return { data: mockPaginatedResponse, status: 200 };
    });

    renderWithClient(<FilteredPropertyList />);

    // Enter min price and max price
    const minInput = screen.getByTestId('min-price-input');
    const maxInput = screen.getByTestId('max-price-input');
    fireEvent.change(minInput, { target: { value: '2000' } });
    fireEvent.change(maxInput, { target: { value: '3000' } });

    // Open mobile drawer to click apply, or use mobile filter drawer apply
    const mobileToggle = screen.getByTestId('mobile-filters-toggle');
    fireEvent.click(mobileToggle);

    const applyBtn = screen.getByTestId('mobile-filters-apply-btn');
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(mockedApiClient.get).toHaveBeenCalledWith(
        expect.stringMatching(/minPrice=2000/),
      );
      expect(mockedApiClient.get).toHaveBeenCalledWith(
        expect.stringMatching(/maxPrice=3000/),
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Downtown Modern Loft')).toBeInTheDocument();
      expect(screen.queryByText('Sunny Beachfront Villa')).not.toBeInTheDocument();
      expect(screen.queryByText('Suburban Family Home')).not.toBeInTheDocument();
    });
  });

  it('applies amenities / popular tags and verifies API params and rendered cards', async () => {
    const filteredPets: PaginatedResponse<Property> = {
      data: [mockPropertyList[0], mockPropertyList[2]],
      total: 2,
      page: 1,
      limit: 10,
      totalPages: 1,
    };

    mockedApiClient.get.mockImplementation(async (url: string) => {
      if (url.includes('petsAllowed=true')) {
        return { data: filteredPets, status: 200 };
      }
      return { data: mockPaginatedResponse, status: 200 };
    });

    renderWithClient(<FilteredPropertyList />);

    // Toggle "Pets Allowed" tag via mobile drawer apply
    const mobileToggle = screen.getByTestId('mobile-filters-toggle');
    fireEvent.click(mobileToggle);

    const petsButton = screen.getByRole('button', { name: 'Pets Allowed' });
    fireEvent.click(petsButton);

    const applyBtn = screen.getByTestId('mobile-filters-apply-btn');
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(mockedApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('petsAllowed=true'),
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Sunny Beachfront Villa')).toBeInTheDocument();
      expect(screen.getByText('Suburban Family Home')).toBeInTheDocument();
      expect(screen.queryByText('Downtown Modern Loft')).not.toBeInTheDocument();
    });
  });

  it('resets all applied filters and restores full property list rendering', async () => {
    renderWithClient(<FilteredPropertyList />);

    // Apply a search
    const searchInput = screen.getByTestId('search-location-input');
    fireEvent.change(searchInput, { target: { value: 'Austin' } });
    fireEvent.click(screen.getByTestId('search-submit-btn'));

    // Wait for the clear button to appear
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument();
    });

    // Click Clear
    const clearBtn = screen.getByRole('button', { name: 'Clear' });
    fireEvent.click(clearBtn);

    await waitFor(() => {
      // Input should be reset
      expect((screen.getByTestId('search-location-input') as HTMLInputElement).value).toBe('');
      // Store filters should be empty
      expect(usePropertyStore.getState().searchQuery).toBe('');
    });
  });

  it('fetches autocomplete suggestions when user types in search input', async () => {
    renderWithClient(<FilteredPropertyList />);

    const searchInput = screen.getByTestId('search-location-input');
    fireEvent.change(searchInput, { target: { value: 'Mia' } });

    await waitFor(() => {
      expect(mockedApiClient.get).toHaveBeenCalledWith(
        expect.stringContaining('/search/suggest?q=Mia'),
      );
    });

    await waitFor(() => {
      expect(screen.getByText('Miami Beach')).toBeInTheDocument();
      expect(screen.getByText('Miami Downtown')).toBeInTheDocument();
    });

    // Clicking suggestion updates search query and hides suggestions
    fireEvent.click(screen.getByText('Miami Beach'));
    expect((screen.getByTestId('search-location-input') as HTMLInputElement).value).toBe('Miami Beach');
  });

  describe('FilterSidebar integration', () => {
    it('applies price range and amenity filters through onApply callback', () => {
      const onApplyMock = vi.fn();
      const onResetMock = vi.fn();

      render(
        <FilterSidebar
          onApply={onApplyMock}
          onReset={onResetMock}
          initialValues={{ minPrice: 1000, maxPrice: 4000, amenities: ['pool'] }}
        />
      );

      // Verify initial values rendered
      expect((screen.getByTestId('filter-min-price') as HTMLInputElement).value).toBe('1000');
      expect((screen.getByTestId('filter-max-price') as HTMLInputElement).value).toBe('4000');
      expect(screen.getByTestId('filter-amenity-pool')).toBeChecked();

      // Change min price
      fireEvent.change(screen.getByTestId('filter-min-price'), { target: { value: '1500' } });

      // Toggle gym amenity
      fireEvent.click(screen.getByTestId('filter-amenity-gym'));

      // Toggle 4-star rating
      fireEvent.click(screen.getByTestId('filter-rating-4'));

      // Submit the form
      fireEvent.click(screen.getByTestId('filter-apply-btn'));

      expect(onApplyMock).toHaveBeenCalledWith({
        minPrice: 1500,
        maxPrice: 4000,
        amenities: expect.arrayContaining(['pool', 'gym']),
        ratings: [4],
      });
    });

    it('handles filter reset properly', () => {
      const onApplyMock = vi.fn();
      const onResetMock = vi.fn();

      render(
        <FilterSidebar
          onApply={onApplyMock}
          onReset={onResetMock}
          initialValues={{ minPrice: 1000, maxPrice: 4000 }}
        />
      );

      fireEvent.click(screen.getByTestId('filter-reset-btn'));

      expect(onResetMock).toHaveBeenCalled();
      expect((screen.getByTestId('filter-min-price') as HTMLInputElement).value).toBe('');
      expect((screen.getByTestId('filter-max-price') as HTMLInputElement).value).toBe('');
    });
  });
});
