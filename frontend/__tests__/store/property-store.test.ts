import { describe, it, expect, beforeEach } from 'vitest';
import { usePropertyStore } from '@/store/property-store';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resetStore() {
  usePropertyStore.setState({
    filters: {},
    sortField: 'createdAt',
    sortDirection: 'desc',
    selectedPropertyId: null,
    viewMode: 'grid',
    searchQuery: '',
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('propertyStore', () => {
  beforeEach(() => {
    resetStore();
  });

  it('starts with sensible defaults', () => {
    const state = usePropertyStore.getState();
    expect(state.filters).toEqual({});
    expect(state.sortField).toBe('createdAt');
    expect(state.sortDirection).toBe('desc');
    expect(state.selectedPropertyId).toBeNull();
    expect(state.viewMode).toBe('grid');
    expect(state.searchQuery).toBe('');
  });

  it('setFilters merges partial filter updates', () => {
    usePropertyStore.getState().setFilters({ city: 'Lagos' });
    expect(usePropertyStore.getState().filters.city).toBe('Lagos');

    usePropertyStore.getState().setFilters({ minPrice: 500 });
    const filters = usePropertyStore.getState().filters;
    expect(filters.city).toBe('Lagos');
    expect(filters.minPrice).toBe(500);
  });

  it('resetFilters clears all filters and searchQuery', () => {
    usePropertyStore.getState().setFilters({ city: 'Abuja', bedrooms: 3 });
    usePropertyStore.getState().setSearchQuery('ocean view');

    usePropertyStore.getState().resetFilters();

    const state = usePropertyStore.getState();
    expect(state.filters).toEqual({});
    expect(state.searchQuery).toBe('');
  });

  it('setSort toggles direction when same field is applied', () => {
    expect(usePropertyStore.getState().sortDirection).toBe('desc');

    usePropertyStore.getState().setSort('createdAt');
    expect(usePropertyStore.getState().sortDirection).toBe('asc');

    usePropertyStore.getState().setSort('createdAt');
    expect(usePropertyStore.getState().sortDirection).toBe('desc');
  });

  it('setSort changes field and uses explicit direction', () => {
    usePropertyStore.getState().setSort('price', 'asc');

    const state = usePropertyStore.getState();
    expect(state.sortField).toBe('price');
    expect(state.sortDirection).toBe('asc');
  });

  it('selectProperty updates selectedPropertyId', () => {
    usePropertyStore.getState().selectProperty('prop-42');
    expect(usePropertyStore.getState().selectedPropertyId).toBe('prop-42');

    usePropertyStore.getState().selectProperty(null);
    expect(usePropertyStore.getState().selectedPropertyId).toBeNull();
  });

  it('setViewMode switches between grid, list, and map', () => {
    usePropertyStore.getState().setViewMode('list');
    expect(usePropertyStore.getState().viewMode).toBe('list');

    usePropertyStore.getState().setViewMode('map');
    expect(usePropertyStore.getState().viewMode).toBe('map');
  });

  it('setSearchQuery updates the query string', () => {
    usePropertyStore.getState().setSearchQuery('Victoria Island');
    expect(usePropertyStore.getState().searchQuery).toBe('Victoria Island');
  });
});
