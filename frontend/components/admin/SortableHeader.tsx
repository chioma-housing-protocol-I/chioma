'use client';

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

interface SortableHeaderProps<K extends string> {
  label: string;
  sortKey: K;
  currentSortBy: K | undefined;
  currentSortOrder: 'ASC' | 'DESC' | undefined;
  onSort: (key: K) => void;
  className?: string;
  align?: 'left' | 'right';
}

/**
 * Clickable table header cell that round-trips sort state to the server.
 * First click sorts ascending; clicking the same column again reverses it.
 */
export function SortableHeader<K extends string>({
  label,
  sortKey,
  currentSortBy,
  currentSortOrder,
  onSort,
  className = '',
  align = 'left',
}: SortableHeaderProps<K>) {
  const isActive = currentSortBy === sortKey;

  return (
    <th
      className={`px-5 py-4 ${className}`}
      aria-sort={
        isActive
          ? currentSortOrder === 'ASC'
            ? 'ascending'
            : 'descending'
          : 'none'
      }
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 transition-colors hover:text-white ${
          isActive ? 'text-white' : ''
        } ${align === 'right' ? 'flex-row-reverse' : ''}`}
      >
        {label}
        {isActive ? (
          currentSortOrder === 'ASC' ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 opacity-30" />
        )}
      </button>
    </th>
  );
}
