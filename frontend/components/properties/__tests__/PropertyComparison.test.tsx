import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import PropertyComparison from '../PropertyComparison';

vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
  }: {
    src: string;
    alt: string;
  }) => React.createElement('img', { src, alt }),
}));

const mockProperties = [
  {
    id: 1,
    title: 'Lagos Apartment',
    price: '$1,200',
    location: 'Victoria Island, Lagos',
    beds: 2,
    baths: 1,
    sqft: 900,
    image: 'https://example.com/a.jpg',
    amenities: ['Pool', 'Gym'],
  },
  {
    id: 2,
    title: 'Abuja House',
    price: '$2,500',
    location: 'Central District, Abuja',
    beds: 3,
    baths: 2,
    sqft: 1800,
    image: 'https://example.com/b.jpg',
    amenities: ['Parking', 'Garden'],
  },
];

describe('PropertyComparison', () => {
  it('shows empty state when no properties are provided', () => {
    render(React.createElement(PropertyComparison, { properties: [] }));

    expect(screen.getByText('No properties to compare')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Add properties from search results to compare them side-by-side.',
      ),
    ).toBeInTheDocument();
  });

  it('renders comparison table with property details and amenities', () => {
    render(
      React.createElement(PropertyComparison, { properties: mockProperties }),
    );

    expect(screen.getByText('Compare')).toBeInTheDocument();
    expect(screen.getByText('2 Properties')).toBeInTheDocument();
    expect(screen.getByText('Lagos Apartment')).toBeInTheDocument();
    expect(screen.getByText('Abuja House')).toBeInTheDocument();
    expect(screen.getByText('Victoria Island, Lagos')).toBeInTheDocument();
    expect(screen.getByText('Central District, Abuja')).toBeInTheDocument();
    expect(screen.getByText('Pool')).toBeInTheDocument();
    expect(screen.getByText('Garden')).toBeInTheDocument();
    expect(screen.getByText('900')).toBeInTheDocument();
    expect(screen.getByText(/1,?800/)).toBeInTheDocument();
  });
});
