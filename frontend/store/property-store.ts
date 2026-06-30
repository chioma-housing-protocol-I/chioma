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
  bathrooms?: number;
  propertyType?: Property['propertyType'];
  status?: Property['status'];
  isFurnished?: boolean;
  hasParking?: boolean;
  petsAllowed?: boolean;
  amenities?: string[];
  state?: string;
  country?: string;
};

export type SortField =
  | 'price'
  | 'createdAt'
  | 'title'
  | 'bedrooms'
  | 'updatedAt';
export type SortDirection = 'asc' | 'desc';

export interface PaginationState {
  page: number;
  limit: number;
}

interface PropertyState {
  filters: PropertyFilter;
  sortField: SortField;
  sortDirection: SortDirection;
  selectedPropertyId: string | null;
  viewMode: 'grid' | 'list' | 'map';
  searchQuery: string;
  pagination: PaginationState;
}

interface PropertyActions {
  setFilters: (filters: Partial<PropertyFilter>) => void;
  resetFilters: () => void;
  setSort: (field: SortField, direction?: SortDirection) => void;
  selectProperty: (id: string | null) => void;
  setViewMode: (mode: PropertyState['viewMode']) => void;
  setSearchQuery: (query: string) => void;
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
}

export type PropertyStore = PropertyState & PropertyActions;

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_FILTERS: PropertyFilter = {};
const DEFAULT_PAGINATION: PaginationState = { page: 1, limit: 20 };

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
      pagination: { ...DEFAULT_PAGINATION },

      // — actions
      setFilters: (filters) => {
        set((state) => {
          Object.assign(state.filters, filters);
          state.pagination.page = 1;
        });
      },

      resetFilters: () => {
        set((state) => {
          state.filters = { ...DEFAULT_FILTERS };
          state.searchQuery = '';
          state.pagination = { ...DEFAULT_PAGINATION };
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
          state.pagination.page = 1;
        });
      },

      setPage: (page) => {
        set((state) => {
          state.pagination.page = Math.max(1, page);
        });
      },

      setLimit: (limit) => {
        set((state) => {
          state.pagination.limit = Math.max(1, Math.min(100, limit));
        });
      },
    }),
    'properties',
  ),
);
