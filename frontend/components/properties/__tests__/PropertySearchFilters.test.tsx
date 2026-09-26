import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

const mockMutateAsync = vi.fn();

vi.mock('@/lib/query/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/query/hooks')>();
  return {
    ...actual,
    useSearchSuggest: vi.fn(() => ({ data: undefined })),
    useCreateSavedSearch: vi.fn(() => ({
      mutateAsync: mockMutateAsync,
      isPending: false,
    })),
  };
});

import { useAuthStore } from '@/store/authStore';
import PropertySearchFilters from '../PropertySearchFilters';

describe('PropertySearchFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ isAuthenticated: false });
  });

  it('renders the location search input', () => {
    render(React.createElement(PropertySearchFilters));
    expect(
      screen.getByPlaceholderText('Search by location, name, or keyword...'),
    ).toBeInTheDocument();
  });

  it('renders the property category select', () => {
    render(React.createElement(PropertySearchFilters));
    expect(screen.getByDisplayValue('All Categories')).toBeInTheDocument();
  });

  it('renders the search button', () => {
    render(React.createElement(PropertySearchFilters));
    expect(screen.getByTestId('search-submit-btn')).toBeInTheDocument();
  });

  it('renders the save search button', () => {
    render(React.createElement(PropertySearchFilters));
    expect(screen.getByTestId('save-search-btn')).toBeInTheDocument();
  });

  it('renders popular filter tags', () => {
    render(React.createElement(PropertySearchFilters));
    expect(
      screen.getByRole('button', { name: 'Verified Only' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Pets Allowed' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Parking' })).toBeInTheDocument();
  });

  it('renders the availability date input', () => {
    render(React.createElement(PropertySearchFilters));
    const dateInputs = document.querySelectorAll('input[type="date"]');
    expect(dateInputs.length).toBeGreaterThan(0);
  });

  it('renders min and max budget inputs', () => {
    render(React.createElement(PropertySearchFilters));
    expect(screen.getByPlaceholderText('Min')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Max')).toBeInTheDocument();
  });

  it('updates min budget input on change', () => {
    render(React.createElement(PropertySearchFilters));
    const minInput = screen.getByPlaceholderText('Min') as HTMLInputElement;
    fireEvent.change(minInput, { target: { value: '500' } });
    expect(minInput.value).toBe('500');
  });

  it('updates max budget input on change', () => {
    render(React.createElement(PropertySearchFilters));
    const maxInput = screen.getByPlaceholderText('Max') as HTMLInputElement;
    fireEvent.change(maxInput, { target: { value: '2000' } });
    expect(maxInput.value).toBe('2000');
  });

  it('shows mobile filters button on mobile layout', () => {
    render(React.createElement(PropertySearchFilters));
    expect(
      screen.getByRole('button', { name: /filters/i }),
    ).toBeInTheDocument();
  });

  it('opens the mobile filters drawer when the mobile filter button is clicked', () => {
    render(React.createElement(PropertySearchFilters));
    const filterBtn = screen.getByRole('button', { name: /filters/i });
    fireEvent.click(filterBtn);
    expect(screen.getByText('Apply Filters')).toBeInTheDocument();
  });

  it('closes the mobile filters drawer when backdrop is clicked', () => {
    render(React.createElement(PropertySearchFilters));
    fireEvent.click(screen.getByRole('button', { name: /filters/i }));
    expect(screen.getByText('Apply Filters')).toBeInTheDocument();

    const backdrop = document.querySelector('.fixed.inset-0 > .absolute');
    if (backdrop) fireEvent.click(backdrop);
    expect(screen.queryByText('Apply Filters')).not.toBeInTheDocument();
  });

  it('closes the mobile filters drawer via the close icon button', () => {
    render(React.createElement(PropertySearchFilters));
    fireEvent.click(screen.getByRole('button', { name: /filters/i }));

    const closeBtn = screen.getByRole('button', { name: '' });
    fireEvent.click(closeBtn);
    expect(screen.queryByText('Apply Filters')).not.toBeInTheDocument();
  });

  describe('save search', () => {
    it('does not open the save search modal for an unauthenticated user', () => {
      useAuthStore.setState({ isAuthenticated: false });
      render(React.createElement(PropertySearchFilters));

      fireEvent.click(screen.getByTestId('save-search-btn'));

      expect(screen.queryByTestId('save-search-modal')).not.toBeInTheDocument();
    });

    it('opens the save search modal for an authenticated user', () => {
      useAuthStore.setState({ isAuthenticated: true });
      render(React.createElement(PropertySearchFilters));

      fireEvent.click(screen.getByTestId('save-search-btn'));

      expect(screen.getByTestId('save-search-modal')).toBeInTheDocument();
    });

    it('submits the saved search with the entered name', async () => {
      useAuthStore.setState({ isAuthenticated: true });
      mockMutateAsync.mockResolvedValue({ id: 'saved-1' });
      render(React.createElement(PropertySearchFilters));

      fireEvent.click(screen.getByTestId('save-search-btn'));
      const nameInput = screen.getByTestId(
        'save-search-name-input',
      ) as HTMLInputElement;
      fireEvent.change(nameInput, { target: { value: 'Lekki 2-beds' } });
      fireEvent.click(screen.getByTestId('save-search-submit-btn'));

      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Lekki 2-beds' }),
      );
    });

    it('closes the save search modal via the close button', () => {
      useAuthStore.setState({ isAuthenticated: true });
      render(React.createElement(PropertySearchFilters));

      fireEvent.click(screen.getByTestId('save-search-btn'));
      expect(screen.getByTestId('save-search-modal')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('save-search-close-btn'));
      expect(screen.queryByTestId('save-search-modal')).not.toBeInTheDocument();
    });
  });
});
