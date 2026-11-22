import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { PropertyListEmptyState } from '../PropertyListEmptyState';

describe('PropertyListEmptyState (#2198)', () => {
  it('suggests clearing filters when filters are active', () => {
    const onClearFilters = vi.fn();
    render(
      <PropertyListEmptyState
        hasFilters
        onClearFilters={onClearFilters}
        onBrowseAll={vi.fn()}
      />,
    );

    expect(
      screen.getByText('No properties match your filters'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Try a different location, property type, or price range.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Next steps:')).toBeInTheDocument();
    expect(screen.getByText('Broaden the price range')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(onClearFilters).toHaveBeenCalledOnce();
  });

  it('offers a browse action when no filters are active', () => {
    const onBrowseAll = vi.fn();
    render(
      <PropertyListEmptyState
        hasFilters={false}
        onClearFilters={vi.fn()}
        onBrowseAll={onBrowseAll}
      />,
    );

    expect(screen.getByText('No properties available yet')).toBeInTheDocument();
    expect(
      screen.getByText(
        'New listings appear here as soon as landlords publish them.',
      ),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Browse all properties' }),
    );
    expect(onBrowseAll).toHaveBeenCalledOnce();
  });

  it('uses a responsive container for the next-step hints', () => {
    render(
      <PropertyListEmptyState
        hasFilters
        onClearFilters={vi.fn()}
        onBrowseAll={vi.fn()}
      />,
    );

    const hints = screen.getByText('Next steps:').parentElement;
    expect(hints?.className).toContain('sm:flex-row');
    expect(screen.getByTestId('property-empty-state').className).toContain(
      'col-span-full',
    );
  });
});
