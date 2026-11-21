import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    ...props
  }: {
    src: string;
    alt: string;
    [key: string]: unknown;
  }) => React.createElement('img', { src, alt, ...props }),
}));

const mockOpenModal = vi.fn();

vi.mock('@/contexts/ModalContext', () => ({
  useModal: vi.fn(() => ({
    openModal: mockOpenModal,
    closeModal: vi.fn(),
    modalState: { type: null, isOpen: false },
  })),
}));

const mockToggleFavorite = vi.fn();

vi.mock('@/lib/query/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/query/hooks')>();
  return {
    ...actual,
    useFavoriteStatus: vi.fn(() => ({ data: undefined })),
    useToggleFavorite: vi.fn(() => ({
      isPending: false,
      toggleFavorite: mockToggleFavorite,
    })),
  };
});

import PropertyCard from '../PropertyCard';

const mockProperty = {
  id: 1,
  price: '$2,500',
  title: 'Luxury Waterfront Apartment',
  location: '123 Ocean Drive, Miami Beach, FL',
  category: 'Apartment',
  beds: 3,
  baths: 2,
  sqft: 1500,
  manager: 'John Smith',
  image: 'https://example.com/image.jpg',
  verified: true,
  amenities: ['Pool', 'Gym', 'Parking'],
};

describe('PropertyCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders property title', () => {
    render(React.createElement(PropertyCard, { property: mockProperty }));

    expect(screen.getByText('Luxury Waterfront Apartment')).toBeInTheDocument();
  });

  it('renders property price', () => {
    render(React.createElement(PropertyCard, { property: mockProperty }));

    expect(screen.getByText('$2,500')).toBeInTheDocument();
  });

  it('renders property location', () => {
    render(React.createElement(PropertyCard, { property: mockProperty }));

    expect(
      screen.getByText('123 Ocean Drive, Miami Beach, FL'),
    ).toBeInTheDocument();
  });

  it('renders bed count', () => {
    render(React.createElement(PropertyCard, { property: mockProperty }));

    expect(screen.getByText('3 Beds')).toBeInTheDocument();
  });

  it('renders bath count', () => {
    render(React.createElement(PropertyCard, { property: mockProperty }));

    expect(screen.getByText('2 Baths')).toBeInTheDocument();
  });

  it('renders square footage', () => {
    render(React.createElement(PropertyCard, { property: mockProperty }));

    expect(screen.getByText('1500 sqft')).toBeInTheDocument();
  });

  it('shows verified badge when property is verified', () => {
    render(React.createElement(PropertyCard, { property: mockProperty }));

    expect(screen.getByText('Verified')).toBeInTheDocument();
  });

  it('shows New Listing badge when property is not verified', () => {
    const unverifiedProperty = { ...mockProperty, verified: false };
    render(React.createElement(PropertyCard, { property: unverifiedProperty }));

    expect(screen.getByText('New Listing')).toBeInTheDocument();
  });

  it('renders manager name', () => {
    render(React.createElement(PropertyCard, { property: mockProperty }));

    expect(screen.getByText('John Smith')).toBeInTheDocument();
  });

  it('renders category tag', () => {
    render(React.createElement(PropertyCard, { property: mockProperty }));

    expect(screen.getByText('Apartment')).toBeInTheDocument();
  });

  it('renders amenities when provided', () => {
    render(React.createElement(PropertyCard, { property: mockProperty }));

    expect(screen.getByText('Pool')).toBeInTheDocument();
    expect(screen.getByText('Gym')).toBeInTheDocument();
    expect(screen.getByText('Parking')).toBeInTheDocument();
  });

  it('shows image with fallback on error', () => {
    render(React.createElement(PropertyCard, { property: mockProperty }));

    const img = screen.getByAltText('Luxury Waterfront Apartment');
    fireEvent.error(img);

    expect(screen.getByText('Image unavailable')).toBeInTheDocument();
  });

  it('renders in list variant', () => {
    render(
      React.createElement(PropertyCard, {
        property: mockProperty,
        variant: 'list',
      }),
    );

    expect(screen.getByText('Smart Lease')).toBeInTheDocument();
  });

  it('renders the wishlist button', () => {
    const { container } = render(
      React.createElement(PropertyCard, { property: mockProperty }),
    );

    const wishlistButton = container.querySelector('button');
    expect(wishlistButton).toBeInTheDocument();
  });

  it('renders Managed by section', () => {
    render(React.createElement(PropertyCard, { property: mockProperty }));

    expect(screen.getByText('Managed by')).toBeInTheDocument();
  });

  it('renders property image', () => {
    render(React.createElement(PropertyCard, { property: mockProperty }));

    const img = screen.getByAltText('Luxury Waterfront Apartment');
    expect(img).toHaveAttribute('src', 'https://example.com/image.jpg');
  });

  // ─── Status: Active State ─────────────────────────────────────────

  describe('active state', () => {
    it('shows the Active status badge when status is "active"', () => {
      const activeProperty = { ...mockProperty, status: 'active' as const };
      render(React.createElement(PropertyCard, { property: activeProperty }));

      expect(screen.getByTestId('status-badge-active')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('defaults to active status when status is not provided', () => {
      render(React.createElement(PropertyCard, { property: mockProperty }));

      expect(screen.getByTestId('status-badge-active')).toBeInTheDocument();
    });

    it('sets data-status="active" on the card element', () => {
      render(React.createElement(PropertyCard, { property: mockProperty }));

      const card = screen.getByTestId('property-card');
      expect(card).toHaveAttribute('data-status', 'active');
    });

    it('does not show Sold or Pending badges', () => {
      const activeProperty = { ...mockProperty, status: 'active' as const };
      render(React.createElement(PropertyCard, { property: activeProperty }));

      expect(screen.queryByTestId('status-badge-sold')).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('status-badge-pending'),
      ).not.toBeInTheDocument();
    });

    it('allows toggling favorites', () => {
      const activeProperty = { ...mockProperty, status: 'active' as const };
      render(React.createElement(PropertyCard, { property: activeProperty }));

      const favButton = screen.getByRole('button', {
        name: /add to favorites/i,
      });
      fireEvent.click(favButton);

      expect(mockToggleFavorite).toHaveBeenCalled();
    });

    it('opens the detail modal on card click', () => {
      const activeProperty = { ...mockProperty, status: 'active' as const };
      render(React.createElement(PropertyCard, { property: activeProperty }));

      fireEvent.click(screen.getByTestId('property-card'));

      expect(mockOpenModal).toHaveBeenCalledWith(
        'propertyDetail',
        expect.objectContaining({
          property: expect.objectContaining({ id: '1' }),
        }),
      );
    });
  });

  // ─── Status: Sold State ───────────────────────────────────────────

  describe('sold state', () => {
    const soldProperty = { ...mockProperty, status: 'sold' as const };

    it('shows the Sold status badge', () => {
      render(React.createElement(PropertyCard, { property: soldProperty }));

      expect(screen.getByTestId('status-badge-sold')).toBeInTheDocument();
      expect(screen.getByText('Sold')).toBeInTheDocument();
    });

    it('sets data-status="sold" on the card element', () => {
      render(React.createElement(PropertyCard, { property: soldProperty }));

      const card = screen.getByTestId('property-card');
      expect(card).toHaveAttribute('data-status', 'sold');
    });

    it('does not show Active or Pending badges', () => {
      render(React.createElement(PropertyCard, { property: soldProperty }));

      expect(
        screen.queryByTestId('status-badge-active'),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('status-badge-pending'),
      ).not.toBeInTheDocument();
    });

    it('renders a sold overlay on the image', () => {
      const { container } = render(
        React.createElement(PropertyCard, { property: soldProperty }),
      );

      // The overlay contains a large "Sold" text
      const overlays = container.querySelectorAll('[class*="bg-black"]');
      expect(overlays.length).toBeGreaterThan(0);
    });

    it('applies reduced opacity to the card', () => {
      render(React.createElement(PropertyCard, { property: soldProperty }));

      const card = screen.getByTestId('property-card');
      expect(card.className).toContain('opacity-75');
    });

    it('disables the favorite button for sold properties', () => {
      render(React.createElement(PropertyCard, { property: soldProperty }));

      const favButton = screen.getByRole('button', {
        name: /add to favorites/i,
      });
      expect(favButton).toBeDisabled();
    });

    it('does not call toggleFavorite when clicking the favorite button on a sold property', () => {
      render(React.createElement(PropertyCard, { property: soldProperty }));

      const favButton = screen.getByRole('button', {
        name: /add to favorites/i,
      });
      fireEvent.click(favButton);

      expect(mockToggleFavorite).not.toHaveBeenCalled();
    });

    it('still renders all property information', () => {
      render(React.createElement(PropertyCard, { property: soldProperty }));

      expect(
        screen.getByText('Luxury Waterfront Apartment'),
      ).toBeInTheDocument();
      expect(screen.getByText('$2,500')).toBeInTheDocument();
      expect(
        screen.getByText('123 Ocean Drive, Miami Beach, FL'),
      ).toBeInTheDocument();
      expect(screen.getByText('3 Beds')).toBeInTheDocument();
      expect(screen.getByText('2 Baths')).toBeInTheDocument();
      expect(screen.getByText('1500 sqft')).toBeInTheDocument();
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });
  });

  // ─── Status: Pending State ────────────────────────────────────────

  describe('pending state', () => {
    const pendingProperty = { ...mockProperty, status: 'pending' as const };

    it('shows the Pending status badge', () => {
      render(React.createElement(PropertyCard, { property: pendingProperty }));

      expect(screen.getByTestId('status-badge-pending')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('sets data-status="pending" on the card element', () => {
      render(React.createElement(PropertyCard, { property: pendingProperty }));

      const card = screen.getByTestId('property-card');
      expect(card).toHaveAttribute('data-status', 'pending');
    });

    it('does not show Active or Sold badges', () => {
      render(React.createElement(PropertyCard, { property: pendingProperty }));

      expect(
        screen.queryByTestId('status-badge-active'),
      ).not.toBeInTheDocument();
      expect(screen.queryByTestId('status-badge-sold')).not.toBeInTheDocument();
    });

    it('does not apply reduced opacity', () => {
      render(React.createElement(PropertyCard, { property: pendingProperty }));

      const card = screen.getByTestId('property-card');
      expect(card.className).not.toContain('opacity-75');
    });

    it('does not render a sold overlay', () => {
      const { container } = render(
        React.createElement(PropertyCard, { property: pendingProperty }),
      );

      // No sold overlay should be present
      const overlay = container.querySelector('[class*="bg-black/40"]');
      expect(overlay).not.toBeInTheDocument();
    });

    it('allows toggling favorites', () => {
      render(React.createElement(PropertyCard, { property: pendingProperty }));

      const favButton = screen.getByRole('button', {
        name: /add to favorites/i,
      });
      expect(favButton).not.toBeDisabled();
      fireEvent.click(favButton);

      expect(mockToggleFavorite).toHaveBeenCalled();
    });

    it('still opens the detail modal on card click', () => {
      render(React.createElement(PropertyCard, { property: pendingProperty }));

      fireEvent.click(screen.getByTestId('property-card'));

      expect(mockOpenModal).toHaveBeenCalledWith(
        'propertyDetail',
        expect.objectContaining({
          property: expect.objectContaining({ id: '1' }),
        }),
      );
    });

    it('still renders all property information', () => {
      render(React.createElement(PropertyCard, { property: pendingProperty }));

      expect(
        screen.getByText('Luxury Waterfront Apartment'),
      ).toBeInTheDocument();
      expect(screen.getByText('$2,500')).toBeInTheDocument();
      expect(
        screen.getByText('123 Ocean Drive, Miami Beach, FL'),
      ).toBeInTheDocument();
      expect(screen.getByText('3 Beds')).toBeInTheDocument();
      expect(screen.getByText('2 Baths')).toBeInTheDocument();
      expect(screen.getByText('1500 sqft')).toBeInTheDocument();
    });
  });

  // ─── Status transitions & combinations ────────────────────────────

  describe('status with variant combinations', () => {
    it('shows sold badge alongside verified badge', () => {
      const soldVerified = {
        ...mockProperty,
        verified: true,
        status: 'sold' as const,
      };
      render(React.createElement(PropertyCard, { property: soldVerified }));

      expect(screen.getByText('Verified')).toBeInTheDocument();
      expect(screen.getByTestId('status-badge-sold')).toBeInTheDocument();
    });

    it('shows pending badge alongside New Listing badge', () => {
      const pendingUnverified = {
        ...mockProperty,
        verified: false,
        status: 'pending' as const,
      };
      render(
        React.createElement(PropertyCard, { property: pendingUnverified }),
      );

      expect(screen.getByText('New Listing')).toBeInTheDocument();
      expect(screen.getByTestId('status-badge-pending')).toBeInTheDocument();
    });

    it('shows active badge in list variant', () => {
      const activeProperty = { ...mockProperty, status: 'active' as const };
      render(
        React.createElement(PropertyCard, {
          property: activeProperty,
          variant: 'list',
        }),
      );

      expect(screen.getByTestId('status-badge-active')).toBeInTheDocument();
      expect(screen.getByText('Smart Lease')).toBeInTheDocument();
    });

    it('shows sold badge in list variant', () => {
      const soldProperty = { ...mockProperty, status: 'sold' as const };
      render(
        React.createElement(PropertyCard, {
          property: soldProperty,
          variant: 'list',
        }),
      );

      expect(screen.getByTestId('status-badge-sold')).toBeInTheDocument();
      expect(screen.getByText('Smart Lease')).toBeInTheDocument();
    });
  });
});
