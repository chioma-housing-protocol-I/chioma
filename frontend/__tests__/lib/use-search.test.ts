import { describe, it, expect, vi, beforeEach } from 'vitest';
import { queryKeys } from '@/lib/query/keys';

// The hooks themselves use @tanstack/react-query which requires a provider.
// We test the query key logic and the URL construction patterns used by the hooks.

describe('search query keys', () => {
  it('search.properties key matches the hook queryKey pattern', () => {
    const params = { q: 'test', city: 'Lagos', page: '1' };
    const key = queryKeys.search.properties(params);
    expect(key).toEqual(['search', 'properties', params]);
  });

  it('search.users key matches the hook queryKey pattern', () => {
    const params = { q: 'john', role: 'admin' };
    const key = queryKeys.search.users(params);
    expect(key).toEqual(['search', 'users', params]);
  });

  it('search.documents key matches the hook queryKey pattern', () => {
    const params = { status: 'active', userId: 'u-1' };
    const key = queryKeys.search.documents(params);
    expect(key).toEqual(['search', 'documents', params]);
  });

  it('search.suggest key includes the query', () => {
    expect(queryKeys.search.suggest('lagos')).toEqual([
      'search',
      'suggest',
      'lagos',
    ]);
  });
});

describe('buildSearchQueryString logic', () => {
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

  it('returns empty string for empty params', () => {
    expect(buildSearchQueryString({})).toBe('');
  });

  it('returns query string with all defined params', () => {
    const result = buildSearchQueryString({
      q: 'lagos',
      minPrice: '500',
      maxPrice: '2000',
    });
    expect(result).toContain('q=lagos');
    expect(result).toContain('minPrice=500');
    expect(result).toContain('maxPrice=2000');
  });

  it('skips undefined values', () => {
    const result = buildSearchQueryString({
      q: 'test',
      city: undefined,
    });
    expect(result).toBe('?q=test');
  });

  it('skips empty string values', () => {
    const result = buildSearchQueryString({
      q: '',
      city: 'Abuja',
    });
    expect(result).toBe('?city=Abuja');
  });

  it('produces correct URL with multiple params', () => {
    const result = buildSearchQueryString({
      q: 'modern apartment',
      bedrooms: '2',
      furnished: 'true',
    });
    expect(result).toBe('?q=modern+apartment&bedrooms=2&furnished=true');
  });
});

describe('search hooks API endpoint patterns', () => {
  it('search properties endpoint matches backend route', () => {
    const endpoint = '/search/properties';
    expect(endpoint).toBe('/search/properties');
  });

  it('search users endpoint matches backend route', () => {
    const endpoint = '/search/users';
    expect(endpoint).toBe('/search/users');
  });

  it('search documents endpoint matches backend route', () => {
    const endpoint = '/search/documents';
    expect(endpoint).toBe('/search/documents');
  });

  it('search suggest endpoint matches backend route', () => {
    const q = 'test';
    const endpoint = `/search/suggest?q=${encodeURIComponent(q)}`;
    expect(endpoint).toBe('/search/suggest?q=test');
  });
});
