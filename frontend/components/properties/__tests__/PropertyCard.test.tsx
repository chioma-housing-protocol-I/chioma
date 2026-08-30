import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('@/contexts/ModalContext', () => ({
  useModal: vi.fn(() => ({
    openModal: vi.fn(),
    closeModal: vi.fn(),
    modalState: { type: null, isOpen: false },
  })),
}));

vi.mock('@/lib/query/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/query/hooks')>();
  return {
    ...actual,
    useFavoriteStatus: vi.fn(() => ({ data: undefined })),
    useToggleFavorite: vi.fn(() => ({
      isPending: false,
      toggleFavorite: vi.fn(),
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
});
