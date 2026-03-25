'use client';

import React from 'react';
import { Search, Filter, Calendar, User, Activity, X } from 'lucide-react';

export interface AuditLogFilterState {
  page: number;
  limit: number;
  search: string;
  action: string;
  startDate: string;
  performedBy: string;
  [key: string]: string | number | undefined;
}

interface FiltersProps {
  filters: AuditLogFilterState;
  setFilters: (filters: AuditLogFilterState) => void;
  onClear: () => void;
}

export const AuditLogFilters: React.FC<FiltersProps> = ({
  filters,
  setFilters,
  onClear,
}) => {
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFilters({ ...filters, [name]: value, page: 1 });
  };

  const hasFilters = Object.values(filters).some(
    (v) => v !== '' && v !== undefined && v !== 1,
  );

  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-3xl p-6 border border-white/10 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Filter size={20} className="text-blue-400" />
          Filters
        </h3>
        {hasFilters && (
          <button
            onClick={onClear}
            className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
          >
            <X size={14} />
            Clear All
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div className="relative group">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300/40 group-focus-within:text-blue-400 transition-colors"
            size={18}
          />
          <input
            type="text"
            name="search"
            value={filters.search || ''}
            onChange={handleChange}
            placeholder="Search logs..."
            className="w-full pl-12 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:bg-white/10 focus:border-blue-500 transition-all"
          />
        </div>

        {/* Action Type */}
        <div className="relative group">
          <Activity
            className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300/40 group-focus-within:text-blue-400 transition-colors"
            size={18}
          />
          <select
            name="action"
            value={filters.action || ''}
            onChange={handleChange}
            className="w-full pl-12 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:bg-white/10 focus:border-blue-500 appearance-none transition-all"
          >
            <option value="" className="bg-slate-900">
              All Actions
            </option>
            <option value="CREATE" className="bg-slate-900">
              Create
            </option>
            <option value="UPDATE" className="bg-slate-900">
              Update
            </option>
            <option value="DELETE" className="bg-slate-900">
              Delete
            </option>
            <option value="LOGIN" className="bg-slate-900">
              Login
            </option>
            <option value="PAYMENT" className="bg-slate-900">
              Payment
            </option>
          </select>
        </div>

        {/* Date Range Start */}
        <div className="relative group">
          <Calendar
            className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300/40 group-focus-within:text-blue-400 transition-colors"
            size={18}
          />
          <input
            type="date"
            name="startDate"
            value={filters.startDate || ''}
            onChange={handleChange}
            className="w-full pl-12 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:bg-white/10 focus:border-blue-500 transition-all [color-scheme:dark]"
          />
        </div>

        {/* Performed By (User ID) */}
        <div className="relative group">
          <User
            className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-300/40 group-focus-within:text-blue-400 transition-colors"
            size={18}
          />
          <input
            type="text"
            name="performedBy"
            value={filters.performedBy || ''}
            onChange={handleChange}
            placeholder="User ID..."
            className="w-full pl-12 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:bg-white/10 focus:border-blue-500 transition-all"
          />
        </div>
      </div>
    </div>
  );
};
