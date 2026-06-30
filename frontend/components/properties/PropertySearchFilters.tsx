'use client';

import {
  Search,
  Home,
  DollarSign,
  Calendar,
  ChevronDown,
  Filter,
  X,
} from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { usePropertyStore } from '@/store/property-store';
import { useSearchSuggest } from '@/lib/query/hooks';

interface FilterOption {
  label: string;
  value: string;
}

const propertyTypes: FilterOption[] = [
  { label: 'All Categories', value: 'all' },
  { label: 'Hotel', value: 'hotel' },
  { label: 'Hotel rooms', value: 'hotel_rooms' },
  { label: 'Stand alone apartment', value: 'stand_alone_apartment' },
  { label: 'Studio apartment', value: 'studio_apartment' },
  { label: 'Hulls', value: 'hulls' },
  { label: 'Apartments with x number of rooms', value: 'apartments_x_rooms' },
  { label: 'Student residence', value: 'student_residence' },
  { label: 'Rooms in shared apartment', value: 'rooms_shared' },
  { label: 'Airbnb', value: 'airbnb' },
];

const POPULAR_TAGS = [
  { label: 'Verified Only', filter: 'verified' },
  { label: 'Pets Allowed', filter: 'petsAllowed' },
  { label: 'Parking', filter: 'parking' },
  { label: 'Furnished', filter: 'furnished' },
  { label: 'Gym', filter: 'gym' },
] as const;

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export default function PropertySearchFilters() {
  const { searchQuery, setSearchQuery, filters, setFilters, resetFilters } =
    usePropertyStore();

  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [minBudget, setMinBudget] = useState(
    filters.minPrice ? String(filters.minPrice) : '',
  );
  const [maxBudget, setMaxBudget] = useState(
    filters.maxPrice ? String(filters.maxPrice) : '',
  );
  const [selectedType, setSelectedType] = useState(
    filters.propertyType || 'all',
  );
  const [availability, setAvailability] = useState('');
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const debouncedSearch = useDebounce(localSearch, 300);

  const { data: suggestions } = useSearchSuggest(
    debouncedSearch.length >= 2 ? debouncedSearch : '',
  );

  useEffect(() => {
    setSearchQuery(debouncedSearch);
  }, [debouncedSearch, setSearchQuery]);

  useEffect(() => {
    setMinBudget(filters.minPrice ? String(filters.minPrice) : '');
    setMaxBudget(filters.maxPrice ? String(filters.maxPrice) : '');
  }, [filters.minPrice, filters.maxPrice]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setSearchQuery(localSearch);
      setShowSuggestions(false);
    },
    [localSearch, setSearchQuery],
  );

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      setLocalSearch(suggestion);
      setSearchQuery(suggestion);
      setShowSuggestions(false);
    },
    [setSearchQuery],
  );

  const handleApplyFilters = useCallback(() => {
    const newFilters: Partial<typeof filters> = {};
    if (minBudget) newFilters.minPrice = Number(minBudget);
    if (maxBudget) newFilters.maxPrice = Number(maxBudget);
    if (selectedType && selectedType !== 'all') {
      newFilters.propertyType = selectedType as import('@/types').PropertyType;
    }
    if (activeTags.has('petsAllowed')) newFilters.petsAllowed = true;
    if (activeTags.has('parking')) newFilters.hasParking = true;

    setFilters(newFilters);
    setIsMobileFiltersOpen(false);
  }, [minBudget, maxBudget, selectedType, activeTags, setFilters]);

  const handleTagToggle = useCallback((tag: string) => {
    setActiveTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  }, []);

  const handleClearFilters = useCallback(() => {
    setLocalSearch('');
    setMinBudget('');
    setMaxBudget('');
    setSelectedType('all');
    setAvailability('');
    setActiveTags(new Set());
    resetFilters();
  }, [resetFilters]);

  const hasActiveFilters =
    localSearch ||
    minBudget ||
    maxBudget ||
    selectedType !== 'all' ||
    activeTags.size > 0;

  return (
    <div
      className="w-full space-y-4 mb-6"
      data-testid="property-search-filters"
    >
      {/* Search Bar - Desktop & Mobile */}
      <form
        onSubmit={handleSearchSubmit}
        className="flex flex-col xl:flex-row gap-4 items-center backdrop-blur-xl bg-slate-800/50 border border-white/10 p-4 rounded-[2rem] shadow-2xl"
      >
        <div className="relative flex-1 w-full xl:w-auto">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-200/50" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search by location, name, or keyword..."
            value={localSearch}
            onChange={(e) => {
              setLocalSearch(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            data-testid="search-location-input"
            className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder:text-blue-200/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
          />

          {/* Autocomplete Suggestions */}
          {showSuggestions && suggestions && suggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute top-full left-0 right-0 mt-1 bg-slate-800 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50"
            >
              {suggestions.map((suggestion, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="w-full text-left px-4 py-3 text-white hover:bg-slate-700 transition-colors text-sm flex items-center gap-2"
                >
                  <Search className="w-3.5 h-3.5 text-blue-200/50 flex-shrink-0" />
                  {suggestion}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="hidden md:flex items-center gap-4 flex-1 w-full">
          {/* Property Category */}
          <div className="relative flex-1">
            <Home className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-200/50" />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              data-testid="property-type-select"
              className="w-full appearance-none bg-slate-900/50 border border-white/5 rounded-2xl py-3.5 pl-12 pr-10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all cursor-pointer"
            >
              {propertyTypes.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-200/50 pointer-events-none" />
          </div>

          {/* Availability Date Picker */}
          <div className="relative flex-1">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-200/50" />
            <input
              type="date"
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
              data-testid="availability-date-input"
              className="w-full appearance-none bg-slate-900/50 border border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-white placeholder:text-blue-200/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all cursor-pointer"
            />
          </div>

          {/* Budget Range */}
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1">
              <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-200/50" />
              <input
                type="number"
                placeholder="Min"
                value={minBudget}
                onChange={(e) => setMinBudget(e.target.value)}
                data-testid="min-price-input"
                className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-3.5 pl-8 pr-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              />
            </div>
            <span className="text-white/50">-</span>
            <div className="relative flex-1">
              <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-200/50" />
              <input
                type="number"
                placeholder="Max"
                value={maxBudget}
                onChange={(e) => setMaxBudget(e.target.value)}
                data-testid="max-price-input"
                className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-3.5 pl-8 pr-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            data-testid="search-submit-btn"
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-8 py-3.5 rounded-2xl transition-all shadow-lg shadow-blue-500/20 active:scale-95"
          >
            Search
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="text-blue-200/50 hover:text-white text-sm px-2 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        {/* Mobile Toggle */}
        <button
          type="button"
          onClick={() => setIsMobileFiltersOpen(true)}
          data-testid="mobile-filters-toggle"
          className="md:hidden w-full flex items-center justify-center gap-2 bg-slate-800/80 text-white py-3.5 rounded-2xl border border-white/5"
        >
          <Filter className="w-5 h-5" />
          <span>Filters</span>
        </button>
      </form>

      {/* Advanced Filters (Facets) - Desktop Only */}
      <div
        className="hidden md:flex flex-wrap items-center gap-3"
        data-testid="popular-filters"
      >
        <span className="text-blue-200/50 text-sm font-medium pr-2">
          Popular:
        </span>
        {POPULAR_TAGS.map((tag) => (
          <button
            key={tag.filter}
            onClick={() => handleTagToggle(tag.filter)}
            className={`px-4 py-2 rounded-xl text-sm transition-all border ${
              activeTags.has(tag.filter)
                ? 'bg-blue-600/30 border-blue-500/50 text-white'
                : 'bg-slate-800/30 hover:bg-slate-700/50 text-blue-200/70 border-white/5 hover:text-white'
            }`}
            data-testid={`filter-tag-${tag.filter.toLowerCase().replace(/\s+/g, '-')}`}
          >
            {tag.label}
          </button>
        ))}
      </div>

      {/* Mobile Filters Modal/Drawer */}
      {isMobileFiltersOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden animate-in fade-in duration-300"
          data-testid="mobile-filters-drawer"
        >
          <div
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => setIsMobileFiltersOpen(false)}
            data-testid="mobile-filters-backdrop"
          />
          <div className="absolute bottom-0 inset-x-0 bg-slate-900 border-t border-white/10 rounded-t-[2.5rem] p-8 space-y-8 animate-in slide-in-from-bottom duration-500 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-white">Filters</h2>
              <button
                onClick={() => setIsMobileFiltersOpen(false)}
                data-testid="mobile-filters-close-btn"
                className="p-2 bg-slate-800 rounded-full text-blue-200/50"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-bold text-blue-200/50 uppercase tracking-widest pl-1">
                  Property Category
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {propertyTypes.slice(1).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setSelectedType(opt.value)}
                      className={`py-3 rounded-xl font-medium transition-all text-xs border ${
                        selectedType === opt.value
                          ? 'bg-blue-600/30 border-blue-500/50 text-white'
                          : 'bg-slate-800 border-white/5 text-white hover:bg-blue-600/20'
                      }`}
                      data-testid={`mobile-type-${opt.value}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-bold text-blue-200/50 uppercase tracking-widest pl-1">
                  Amenities
                </label>
                <div className="flex flex-wrap gap-2">
                  {POPULAR_TAGS.slice(1).map((tag) => (
                    <button
                      key={tag.filter}
                      onClick={() => handleTagToggle(tag.filter)}
                      className={`px-4 py-2 rounded-xl text-sm transition-all border ${
                        activeTags.has(tag.filter)
                          ? 'bg-blue-600/30 border-blue-500/50 text-white'
                          : 'bg-slate-800 border-white/5 text-blue-200/70 hover:text-white'
                      }`}
                    >
                      {tag.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-bold text-blue-200/50 uppercase tracking-widest pl-1">
                  Availability
                </label>
                <input
                  type="date"
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  data-testid="mobile-availability-date-input"
                  className="w-full bg-slate-800 border border-white/5 rounded-xl py-4 px-4 text-white focus:outline-none"
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-bold text-blue-200/50 uppercase tracking-widest pl-1">
                  Budget
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    placeholder="Min Price"
                    value={minBudget}
                    onChange={(e) => setMinBudget(e.target.value)}
                    data-testid="mobile-min-price-input"
                    className="flex-1 bg-slate-800 border border-white/5 py-3 px-4 rounded-xl text-white font-medium focus:outline-none"
                  />
                  <span className="text-white">-</span>
                  <input
                    type="number"
                    placeholder="Max Price"
                    value={maxBudget}
                    onChange={(e) => setMaxBudget(e.target.value)}
                    data-testid="mobile-max-price-input"
                    className="flex-1 bg-slate-800 border border-white/5 py-3 px-4 rounded-xl text-white font-medium focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleApplyFilters}
              data-testid="mobile-filters-apply-btn"
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/20 transition-all mt-4"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
