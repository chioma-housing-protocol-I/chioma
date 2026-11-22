'use client';

import { Building2, SearchX } from 'lucide-react';
import React from 'react';

import { EmptyState } from '@/components/ui/EmptyState';

interface PropertyListEmptyStateProps {
  hasFilters: boolean;
  onClearFilters: () => void;
  onBrowseAll: () => void;
}

/**
 * Empty state for the property listing route (#2198).
 *
 * Pending state is intentionally presentational. The parent owns the filter
 * state and the URL, so the suggestions here only explain the next step and
 * delegate the actual reset to the parent callbacks.
 */
export function PropertyListEmptyState({
  hasFilters,
  onClearFilters,
  onBrowseAll,
}: PropertyListEmptyStateProps) {
  const Icon = hasFilters ? SearchX : Building2;

  return (
    <div
      className="col-span-full flex flex-col items-center"
      data-testid="property-empty-state"
    >
      <EmptyState
        icon={Icon}
        title={
          hasFilters
            ? 'No properties match your filters'
            : 'No properties available yet'
        }
        description={
          hasFilters
            ? 'Try a different location, property type, or price range.'
            : 'New listings appear here as soon as landlords publish them.'
        }
        actionLabel={hasFilters ? 'Clear filters' : 'Browse all properties'}
        onAction={hasFilters ? onClearFilters : onBrowseAll}
        variant="dark"
        className="w-full max-w-xl"
      />
      <p className="mt-4 flex flex-col items-center gap-1 text-center text-xs text-blue-200/50 sm:flex-row sm:gap-3">
        <span className="font-semibold text-blue-200/70">Next steps:</span>
        <span>Broaden the price range</span>
        <span className="hidden sm:inline">·</span>
        <span>Remove a property type filter</span>
        <span className="hidden sm:inline">·</span>
        <span>Search a nearby location</span>
      </p>
    </div>
  );
}
