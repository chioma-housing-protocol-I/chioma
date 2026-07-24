import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn(),
  },
}));

const { apiClient } = vi.mocked(await import('@/lib/api-client'));

import {
  useSearchProperties,
  useSearchUsers,
  useSearchDocuments,
  useSearchSuggest,
} from '@/lib/query/hooks';
import type { SearchResult, User } from '@/types';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    );
  };
}

describe('useSearchProperties', () => {
  const mockResponse: SearchResult<Record<string, unknown>> = {
    items: [
      { id: '1', title: 'Luxury Apartment', city: 'Lagos' },
      { id: '2', title: 'Cozy Studio', city: 'Abuja' },
    ],
    total: 2,
    page: 1,
    limit: 20,
    facets: {
      types: [{ type: 'apartment', count: 2 }],
      cities: [
        { city: 'Lagos', count: 1 },
        { city: 'Abuja', count: 1 },
      ],
      priceRanges: [
        { label: 'Under $500', min: 0, max: 500, count: 0 },
        { label: '$500-$1000', min: 500, max: 1000, count: 1 },
        { label: 'Over $2000', min: 2000, max: 999999, count: 1 },
      ],
      amenities: { furnished: 1, parking: 0, petsAllowed: 0 },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches properties with default params', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: mockResponse,
      status: 200,
    });

    const { result } = renderHook(() => useSearchProperties(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiClient.get).toHaveBeenCalledWith('/search/properties');
    expect(result.current.data).toEqual(mockResponse);
  });

  it('passes query params to the API', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: mockResponse,
      status: 200,
    });

    const { result } = renderHook(
      () =>
        useSearchProperties({
          q: 'lagos',
          minPrice: '500',
          maxPrice: '2000',
          bedrooms: '2',
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiClient.get).toHaveBeenCalledWith(
      '/search/properties?q=lagos&minPrice=500&maxPrice=2000&bedrooms=2',
    );
  });

  it('handles filter combinations', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: mockResponse,
      status: 200,
    });

    const { result } = renderHook(
      () =>
        useSearchProperties({
          q: 'modern',
          city: 'Lagos',
          type: 'apartment',
          furnished: 'true',
          parking: 'true',
          sortBy: 'price',
          sortOrder: 'asc',
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiClient.get).toHaveBeenCalledWith(
      '/search/properties?q=modern&city=Lagos&type=apartment&furnished=true&parking=true&sortBy=price&sortOrder=asc',
    );
  });

  it('includes pagination params', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: mockResponse,
      status: 200,
    });

    const { result } = renderHook(
      () => useSearchProperties({ page: '2', limit: '10' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiClient.get).toHaveBeenCalledWith(
      '/search/properties?page=2&limit=10',
    );
  });

  it('handles geospatial params', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: mockResponse,
      status: 200,
    });

    const { result } = renderHook(
      () =>
        useSearchProperties({
          lat: '6.5244',
          lng: '3.3792',
          radiusKm: '10',
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiClient.get).toHaveBeenCalledWith(
      '/search/properties?lat=6.5244&lng=3.3792&radiusKm=10',
    );
  });

  it('handles amenities as comma separated list', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: mockResponse,
      status: 200,
    });

    const { result } = renderHook(
      () =>
        useSearchProperties({
          amenities: 'wifi,pool,gym',
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiClient.get).toHaveBeenCalledWith(
      '/search/properties?amenities=wifi%2Cpool%2Cgym',
    );
  });
});

describe('useSearchUsers', () => {
  const mockUsersResponse = {
    items: [
      { id: 'u1', firstName: 'John', lastName: 'Doe', email: 'john@test.com' },
    ],
    total: 1,
    page: 1,
    limit: 20,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches users with query', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: mockUsersResponse,
      status: 200,
    });

    const { result } = renderHook(
      () => useSearchUsers({ q: 'john', role: 'tenant' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiClient.get).toHaveBeenCalledWith(
      '/search/users?q=john&role=tenant',
    );
    expect(result.current.data).toEqual(mockUsersResponse);
  });

  it('filters by user status', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { items: [], total: 0, page: 1, limit: 20 },
      status: 200,
    });

    const { result } = renderHook(
      () => useSearchUsers({ isActive: 'true', kycVerified: 'true' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiClient.get).toHaveBeenCalledWith(
      '/search/users?isActive=true&kycVerified=true',
    );
  });

  it('sorts users', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { items: [], total: 0, page: 1, limit: 20 },
      status: 200,
    });

    const { result } = renderHook(
      () => useSearchUsers({ sortBy: 'createdAt', sortOrder: 'desc' }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiClient.get).toHaveBeenCalledWith(
      '/search/users?sortBy=createdAt&sortOrder=desc',
    );
  });
});

describe('useSearchDocuments', () => {
  const mockDocumentsResponse = {
    items: [
      {
        id: 'd1',
        agreementNumber: 'AGR-001',
        status: 'active',
      },
    ],
    total: 1,
    page: 1,
    limit: 20,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches documents with filters', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: mockDocumentsResponse,
      status: 200,
    });

    const { result } = renderHook(
      () =>
        useSearchDocuments({
          q: 'AGR',
          status: 'active',
          propertyId: 'p-1',
          userId: 'u-1',
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiClient.get).toHaveBeenCalledWith(
      '/search/documents?q=AGR&status=active&propertyId=p-1&userId=u-1',
    );
    expect(result.current.data).toEqual(mockDocumentsResponse);
  });

  it('filters by rent range and date range', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { items: [], total: 0, page: 1, limit: 20 },
      status: 200,
    });

    const { result } = renderHook(
      () =>
        useSearchDocuments({
          minRent: '500',
          maxRent: '2000',
          dateFrom: '2024-01-01',
          dateTo: '2024-12-31',
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiClient.get).toHaveBeenCalledWith(
      '/search/documents?minRent=500&maxRent=2000&dateFrom=2024-01-01&dateTo=2024-12-31',
    );
  });

  it('sorts documents', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: { items: [], total: 0, page: 1, limit: 20 },
      status: 200,
    });

    const { result } = renderHook(
      () =>
        useSearchDocuments({
          sortBy: 'monthlyRent',
          sortOrder: 'asc',
        }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiClient.get).toHaveBeenCalledWith(
      '/search/documents?sortBy=monthlyRent&sortOrder=asc',
    );
  });
});

describe('useSearchSuggest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches suggestions for a valid query', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: ['Lagos Apartment', 'Lagos Villa', 'Lagos Studio'],
      status: 200,
    });

    const { result } = renderHook(() => useSearchSuggest('lagos'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiClient.get).toHaveBeenCalledWith('/search/suggest?q=lagos');
    expect(result.current.data).toEqual([
      'Lagos Apartment',
      'Lagos Villa',
      'Lagos Studio',
    ]);
  });

  it('does not fetch for short queries', async () => {
    const { result } = renderHook(() => useSearchSuggest('a'), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it('fetches for exactly 2 character queries', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: ['La Vista', 'Lagoon View'],
      status: 200,
    });

    const { result } = renderHook(() => useSearchSuggest('la'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiClient.get).toHaveBeenCalledWith('/search/suggest?q=la');
  });

  it('encodes special characters in query', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: [],
      status: 200,
    });

    const { result } = renderHook(() => useSearchSuggest('apartment & villa'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiClient.get).toHaveBeenCalledWith(
      '/search/suggest?q=apartment%20%26%20villa',
    );
  });
});

describe('buildSearchQueryString - filter combinations', () => {
  function buildSearchQueryString(
    params: Record<string, string | undefined>,
  ): string {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== '' && val !== null) {
        qs.append(key, val);
      }
    });
    const str = qs.toString();
    return str ? `?${str}` : '';
  }

  it('combines all property filter types', () => {
    const result = buildSearchQueryString({
      q: 'lagos',
      city: 'Lagos',
      state: 'Lagos',
      country: 'Nigeria',
      type: 'apartment',
      status: 'available',
      minPrice: '500',
      maxPrice: '5000',
      bedrooms: '3',
      bathrooms: '2',
      furnished: 'true',
      parking: 'true',
      petsAllowed: 'false',
      amenities: 'wifi,pool',
      lat: '6.5',
      lng: '3.4',
      radiusKm: '20',
      page: '1',
      limit: '20',
      sortBy: 'price',
      sortOrder: 'asc',
    });
    expect(result).toContain('q=lagos');
    expect(result).toContain('city=Lagos');
    expect(result).toContain('state=Lagos');
    expect(result).toContain('country=Nigeria');
    expect(result).toContain('type=apartment');
    expect(result).toContain('status=available');
    expect(result).toContain('minPrice=500');
    expect(result).toContain('maxPrice=5000');
    expect(result).toContain('bedrooms=3');
    expect(result).toContain('bathrooms=2');
    expect(result).toContain('furnished=true');
    expect(result).toContain('parking=true');
    expect(result).toContain('petsAllowed=false');
    expect(result).toContain('amenities=wifi%2Cpool');
    expect(result).toContain('lat=6.5');
    expect(result).toContain('lng=3.4');
    expect(result).toContain('radiusKm=20');
    expect(result).toContain('page=1');
    expect(result).toContain('limit=20');
    expect(result).toContain('sortBy=price');
    expect(result).toContain('sortOrder=asc');
  });

  it('handles partial filter combinations', () => {
    const result = buildSearchQueryString({
      q: 'test',
      minPrice: '1000',
      bedrooms: '2',
    });
    expect(result).toBe('?q=test&minPrice=1000&bedrooms=2');
  });

  it('handles empty partial filter combinations', () => {
    const result = buildSearchQueryString({
      q: '',
      city: undefined,
      minPrice: null as unknown as string,
    });
    expect(result).toBe('');
  });

  it('handles all boolean filter combinations', () => {
    const result = buildSearchQueryString({
      furnished: 'true',
      parking: 'false',
      petsAllowed: 'true',
    });
    expect(result).toBe('?furnished=true&parking=false&petsAllowed=true');
  });

  it('handles user search filters', () => {
    const result = buildSearchQueryString({
      q: 'admin',
      role: 'admin',
      isActive: 'true',
      kycVerified: 'true',
      sortBy: 'email',
      sortOrder: 'asc',
    });
    expect(result).toBe(
      '?q=admin&role=admin&isActive=true&kycVerified=true&sortBy=email&sortOrder=asc',
    );
  });

  it('handles document search filters', () => {
    const result = buildSearchQueryString({
      q: 'AGR-',
      status: 'active',
      propertyId: 'p-123',
      userId: 'u-456',
      adminId: 'a-789',
      minRent: '1000',
      maxRent: '5000',
      dateFrom: '2024-01-01',
      dateTo: '2024-12-31',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    expect(result).toBe(
      '?q=AGR-&status=active&propertyId=p-123&userId=u-456&adminId=a-789&minRent=1000&maxRent=5000&dateFrom=2024-01-01&dateTo=2024-12-31&sortBy=createdAt&sortOrder=desc',
    );
  });

  it('encodes special characters in query values', () => {
    const result = buildSearchQueryString({
      q: 'hello world & more',
      city: 'San Francisco',
    });
    expect(result).toContain('q=hello+world+%26+more');
    expect(result).toContain('city=San+Francisco');
  });

  it('handles numeric page/limit boundaries', () => {
    expect(buildSearchQueryString({ page: '0', limit: '0' })).toBe(
      '?page=0&limit=0',
    );
    expect(buildSearchQueryString({ page: '999', limit: '999' })).toBe(
      '?page=999&limit=999',
    );
  });

  it('handles amenity empty string edge case', () => {
    const result = buildSearchQueryString({
      amenities: '',
    });
    expect(result).toBe('');
  });
});
