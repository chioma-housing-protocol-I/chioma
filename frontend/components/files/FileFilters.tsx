import React from 'react';
import { Search, Filter, LayoutGrid, List } from 'lucide-react';

interface Props {
  search: string;
  setSearch: (value: string) => void;
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
  filterType: string;
  setFilterType: (type: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
}

export const FileFilters: React.FC<Props> = ({
  search,
  setSearch,
  viewMode,
  setViewMode,
  filterType,
  setFilterType,
  sortBy,
  setSortBy,
}) => {
  return (
    <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
      {/* Search */}
      <div className="relative w-full md:max-w-md">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
          size={18}
        />
        <input
          type="text"
          placeholder="Search files..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none transition-all dark:text-white"
        />
      </div>

      <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
        {/* Type Filter */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-blue dark:text-white"
        >
          <option value="all">All Types</option>
          <option value="image">Images</option>
          <option value="pdf">PDFs</option>
          <option value="video">Videos</option>
          <option value="audio">Audio</option>
          <option value="document">Documents</option>
          <option value="archive">Archives</option>
        </select>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-blue dark:text-white"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="name">Name (A-Z)</option>
          <option value="size">Size (Large First)</option>
        </select>

        {/* View Toggle */}
        <div className="flex bg-neutral-200 dark:bg-neutral-700 rounded-xl p-1 gap-1">
          <button
            onClick={() => setViewMode('list')}
            className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-neutral-600 shadow-sm text-brand-blue' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
            title="List View"
          >
            <List size={18} />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-neutral-600 shadow-sm text-brand-blue' : 'text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'}`}
            title="Grid View"
          >
            <LayoutGrid size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};
