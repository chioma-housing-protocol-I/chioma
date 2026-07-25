import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import PropertyComparison from '../PropertyComparison';

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

const mockProperties = [
  {
    id: 1,
    title: 'Sea View Apartment',
    price: '$2,500',
    location: 'Lagos Island, Lagos',
    beds: 3,
    baths: 2,
    sqft: 1400,
    image: 'https://example.com/img1.jpg',
    amenities: ['Pool', 'Gym', 'Parking'],
  },
  {
    id: 2,
    title: 'Garden Studio',
    price: '$1,200',
    location: 'Lekki Phase 1, Lagos',
    beds: 1,
    baths: 1,
    sqft: 600,
    image: 'https://example.com/img2.jpg',
    amenities: ['Gym', 'Internet'],
  },
];

describe('PropertyComparison', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the empty-state message when no properties are provided', () => {
    render(React.createElement(PropertyComparison, { properties: [] }));
    expect(screen.getByText('No properties to compare')).toBeInTheDocument();
  });

  it('shows a helpful sub-message in the empty state', () => {
    render(React.createElement(PropertyComparison, { properties: [] }));
    expect(
      screen.getByText(
        'Add properties from search results to compare them side-by-side.',
      ),
    ).toBeInTheDocument();
  });

  it('renders a Compare heading when properties are provided', () => {
    render(
      React.createElement(PropertyComparison, { properties: mockProperties }),
    );
    expect(screen.getByText('Compare')).toBeInTheDocument();
  });

  it('displays the correct property count', () => {
    render(
      React.createElement(PropertyComparison, { properties: mockProperties }),
    );
    expect(screen.getByText('2 Properties')).toBeInTheDocument();
  });

  it('renders each property title', () => {
    render(
      React.createElement(PropertyComparison, { properties: mockProperties }),
    );
    expect(screen.getByText('Sea View Apartment')).toBeInTheDocument();
    expect(screen.getByText('Garden Studio')).toBeInTheDocument();
  });

  it('renders each property price', () => {
    render(
      React.createElement(PropertyComparison, { properties: mockProperties }),
    );
    expect(screen.getByText('$2,500')).toBeInTheDocument();
    expect(screen.getByText('$1,200')).toBeInTheDocument();
  });

  it('renders each property location', () => {
    render(
      React.createElement(PropertyComparison, { properties: mockProperties }),
    );
    expect(screen.getByText('Lagos Island, Lagos')).toBeInTheDocument();
    expect(screen.getByText('Lekki Phase 1, Lagos')).toBeInTheDocument();
  });

  it('renders bedroom counts for each property', () => {
    render(
      React.createElement(PropertyComparison, { properties: mockProperties }),
    );
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1);
  });

  it('renders square footage with locale formatting', () => {
    render(
      React.createElement(PropertyComparison, { properties: mockProperties }),
    );
    expect(screen.getByText('1,400')).toBeInTheDocument();
    expect(screen.getByText('600')).toBeInTheDocument();
  });

  it('renders merged unique amenity rows', () => {
    render(
      React.createElement(PropertyComparison, { properties: mockProperties }),
    );
    expect(screen.getByText('Pool')).toBeInTheDocument();
    expect(screen.getByText('Gym')).toBeInTheDocument();
    expect(screen.getByText('Parking')).toBeInTheDocument();
    expect(screen.getByText('Internet')).toBeInTheDocument();
  });

  it('renders View Details buttons for each property', () => {
    render(
      React.createElement(PropertyComparison, { properties: mockProperties }),
    );
    const buttons = screen.getAllByRole('button', { name: 'View Details' });
    expect(buttons).toHaveLength(mockProperties.length);
  });

  it('renders property images', () => {
    render(
      React.createElement(PropertyComparison, { properties: mockProperties }),
    );
    expect(screen.getByAltText('Sea View Apartment')).toBeInTheDocument();
    expect(screen.getByAltText('Garden Studio')).toBeInTheDocument();
  });
});
