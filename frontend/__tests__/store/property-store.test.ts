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
    pagination: { page: 1, limit: 20 },
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
    expect(state.pagination).toEqual({ page: 1, limit: 20 });
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

  it('setSearchQuery resets page to 1', () => {
    usePropertyStore.getState().setPage(3);
    usePropertyStore.getState().setSearchQuery('new search');
    expect(usePropertyStore.getState().pagination.page).toBe(1);
  });

  it('setPage updates page number', () => {
    usePropertyStore.getState().setPage(5);
    expect(usePropertyStore.getState().pagination.page).toBe(5);
  });

  it('setPage does not go below 1', () => {
    usePropertyStore.getState().setPage(0);
    expect(usePropertyStore.getState().pagination.page).toBe(1);
  });

  it('setLimit updates limit within bounds', () => {
    usePropertyStore.getState().setLimit(50);
    expect(usePropertyStore.getState().pagination.limit).toBe(50);
  });

  it('setLimit caps at 100', () => {
    usePropertyStore.getState().setLimit(200);
    expect(usePropertyStore.getState().pagination.limit).toBe(100);
  });

  it('setLimit minimum is 1', () => {
    usePropertyStore.getState().setLimit(0);
    expect(usePropertyStore.getState().pagination.limit).toBe(1);
  });

  it('setFilters resets page to 1', () => {
    usePropertyStore.getState().setPage(3);
    usePropertyStore.getState().setFilters({ city: 'Abuja' });
    expect(usePropertyStore.getState().pagination.page).toBe(1);
  });

  it('resetFilters clears pagination', () => {
    usePropertyStore.getState().setPage(3);
    usePropertyStore.getState().setLimit(50);
    usePropertyStore.getState().resetFilters();
    expect(usePropertyStore.getState().pagination).toEqual({
      page: 1,
      limit: 20,
    });
  });
});
