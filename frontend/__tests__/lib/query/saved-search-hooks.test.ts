import { describe, it, expect } from 'vitest';
import { queryKeys } from '@/lib/query/keys';
import { toSavedSearchFilters } from '@/lib/query/hooks/use-saved-searches';

describe('saved searches query keys', () => {
  it('all is a stable tuple', () => {
    expect(queryKeys.savedSearches.all).toEqual(['saved-searches']);
  });

  it('list extends all', () => {
    expect(queryKeys.savedSearches.list()).toEqual(['saved-searches', 'list']);
  });
});

describe('toSavedSearchFilters', () => {
  it('omits fields that are absent from the params', () => {
    expect(toSavedSearchFilters({})).toEqual({});
  });

  it('maps querystring-shaped params to typed filters', () => {
    const filters = toSavedSearchFilters({
      q: 'lekki apartment',
      city: 'Lekki',
      minPrice: '1000',
      maxPrice: '2000',
      bedrooms: '2',
      furnished: 'true',
      parking: 'false',
      amenities: 'gym,pool',
    });

    expect(filters).toEqual({
      q: 'lekki apartment',
      city: 'Lekki',
      minPrice: 1000,
      maxPrice: 2000,
      bedrooms: 2,
      furnished: true,
      parking: false,
      amenities: ['gym', 'pool'],
    });
  });
});
