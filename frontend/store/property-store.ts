'use client';

import { create } from 'zustand';
import { withMiddleware } from './middleware';
import type { Property } from '@/types';

// ─── Types ───────────────────────────────────────────────────────────────────

export type PropertyFilter = {
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  propertyType?: Property['propertyType'];
  status?: Property['status'];
};

export type SortField = 'price' | 'createdAt' | 'title';
export type SortDirection = 'asc' | 'desc';

interface PropertyState {
  filters: PropertyFilter;
  sortField: SortField;
  sortDirection: SortDirection;
  selectedPropertyId: string | null;
  viewMode: 'grid' | 'list' | 'map';
  searchQuery: string;
}

interface PropertyActions {
  setFilters: (filters: Partial<PropertyFilter>) => void;
  resetFilters: () => void;
  setSort: (field: SortField, direction?: SortDirection) => void;
  selectProperty: (id: string | null) => void;
  setViewMode: (mode: PropertyState['viewMode']) => void;
  setSearchQuery: (query: string) => void;
}

export type PropertyStore = PropertyState & PropertyActions;

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_FILTERS: PropertyFilter = {};

// ─── Store ───────────────────────────────────────────────────────────────────

export const usePropertyStore = create<PropertyStore>()(
  withMiddleware(
    (set) => ({
      // — state
      filters: DEFAULT_FILTERS,
      sortField: 'createdAt',
      sortDirection: 'desc',
      selectedPropertyId: null,
      viewMode: 'grid',
      searchQuery: '',

      // — actions
      setFilters: (filters) => {
        set((state) => {
          Object.assign(state.filters, filters);
        });
      },

      resetFilters: () => {
        set((state) => {
          state.filters = { ...DEFAULT_FILTERS };
          state.searchQuery = '';
        });
      },

      setSort: (field, direction) => {
        set((state) => {
          if (state.sortField === field && !direction) {
            state.sortDirection =
              state.sortDirection === 'asc' ? 'desc' : 'asc';
          } else {
            state.sortField = field;
            state.sortDirection = direction ?? 'desc';
          }
        });
      },

      selectProperty: (id) => {
        set((state) => {
          state.selectedPropertyId = id;
        });
      },

      setViewMode: (mode) => {
        set((state) => {
          state.viewMode = mode;
        });
      },

      setSearchQuery: (query) => {
        set((state) => {
          state.searchQuery = query;
        });
      },
    }),
    'properties',
  ),
);
