'use client';

import { Search, Filter, Bell } from 'lucide-react';
import { useState } from 'react';

interface SearchFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

export default function SearchFilters({
  searchQuery,
  setSearchQuery,
}: SearchFiltersProps) {
  const [selectedFilter, setSelectedFilter] = useState('Property Type');

  return (
    <div className="sticky top-[88px] z-40 w-full glass-dark border-b border-white/10 shadow-lg backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
        <div className="flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
          {/* Search Input */}
          <div className="flex items-center gap-3 bg-white/10 rounded-full px-5 py-3 w-full lg:w-96 border border-white/20 transition-all focus-within:bg-white/15 focus-within:border-white/30 hover:bg-white/15 shadow-inner">
            <Search className="w-5 h-5 text-gray-300 shrink-0" />
            <input
              type="text"
              placeholder="City, neighborhood, or address"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent outline-none flex-1 text-sm text-white placeholder-gray-400 font-medium tracking-wide"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button className="px-5 py-2.5 text-sm border border-white/20 text-gray-300 rounded-full hover:bg-white/10 hover:text-white transition-all font-medium backdrop-blur-md">
              Price Range
            </button>
            <button
              onClick={() => setSelectedFilter('Property Type')}
              className={`px-5 py-2.5 text-sm rounded-full transition-all font-medium backdrop-blur-md shadow-lg border ${
                selectedFilter === 'Property Type'
                  ? 'bg-brand-blue text-white border-brand-blue/50'
                  : 'border-white/20 text-gray-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              Property Type
            </button>
            <button className="px-5 py-2.5 text-sm border border-white/20 text-gray-300 rounded-full hover:bg-white/10 hover:text-white transition-all font-medium backdrop-blur-md">
              Beds & Baths
            </button>
            <button className="hidden sm:inline-block px-5 py-2.5 text-sm border border-white/20 text-gray-300 rounded-full hover:bg-white/10 hover:text-white transition-all font-medium backdrop-blur-md">
              Amenities
            </button>

            {/* Actions */}
            <div className="flex items-center gap-2.5 ml-auto pl-2 border-l border-white/10">
              <button className="flex items-center gap-2 px-5 py-2.5 text-sm border border-white/20 text-white rounded-full hover:bg-white/10 transition-all font-semibold shadow-md">
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Filters</span>
              </button>
              <button className="flex items-center gap-2 px-5 py-2.5 text-sm bg-white text-brand-blue rounded-full hover:bg-white/90 transition-all font-bold shadow-xl">
                <Bell className="w-4 h-4" />
                <span className="hidden sm:inline">Save Search</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
