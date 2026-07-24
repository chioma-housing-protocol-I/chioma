import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { PropertyListingHeader } from '../PropertyListingHeader';

describe('PropertyListingHeader', () => {
  it('renders the count of properties', () => {
    render(React.createElement(PropertyListingHeader, { count: 42 }));

    expect(screen.getAllByText('42 Premium Stays').length).toBe(2);
  });

  it('renders with zero count', () => {
    render(React.createElement(PropertyListingHeader, { count: 0 }));

    expect(screen.getAllByText('0 Premium Stays').length).toBe(2);
  });

  it('renders with large count', () => {
    render(React.createElement(PropertyListingHeader, { count: 999 }));

    expect(screen.getAllByText('999 Premium Stays').length).toBe(2);
  });

  it('renders the default sort option', () => {
    render(React.createElement(PropertyListingHeader, { count: 10 }));

    const selects = screen.getAllByRole('combobox');
    const desktopSelect = selects[1];
    expect(desktopSelect).toHaveValue('Recommended');
  });

  it('renders sort options', () => {
    render(React.createElement(PropertyListingHeader, { count: 10 }));

    const selects = screen.getAllByRole('combobox');
    const desktopSelect = selects[1];
    const options = Array.from(
      (desktopSelect as HTMLSelectElement).options,
    ).map((o) => o.value);

    expect(options).toContain('Recommended');
    expect(options).toContain('Price: Low to High');
    expect(options).toContain('Price: High to Low');
    expect(options).toContain('Newest First');
  });

  it('calls onSortChange when sort option changes', () => {
    const onSortChange = vi.fn();
    render(
      React.createElement(PropertyListingHeader, { count: 10, onSortChange }),
    );

    const selects = screen.getAllByRole('combobox');
    const desktopSelect = selects[1];
    fireEvent.change(desktopSelect, {
      target: { value: 'Price: Low to High' },
    });

    expect(onSortChange).toHaveBeenCalledWith('Price: Low to High');
  });

  it('renders the blockchain verified badge on desktop', () => {
    render(React.createElement(PropertyListingHeader, { count: 10 }));

    expect(screen.getByText('Blockchain Verified')).toBeInTheDocument();
  });

  it('renders the description text', () => {
    render(React.createElement(PropertyListingHeader, { count: 10 }));

    expect(
      screen.getByText(/Discover luxury blockchain-verified properties/),
    ).toBeInTheDocument();
  });

  it('handles undefined onSortChange gracefully', () => {
    render(React.createElement(PropertyListingHeader, { count: 5 }));

    const selects = screen.getAllByRole('combobox');
    const desktopSelect = selects[1];
    expect(() => {
      fireEvent.change(desktopSelect, { target: { value: 'Newest First' } });
    }).not.toThrow();
  });

  it('renders with custom sortBy value', () => {
    render(
      React.createElement(PropertyListingHeader, {
        count: 10,
        sortBy: 'Price: High to Low',
      }),
    );

    const selects = screen.getAllByRole('combobox');
    const desktopSelect = selects[1];
    expect(desktopSelect).toHaveValue('Price: High to Low');
  });
});
