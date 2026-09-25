import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('leaflet/dist/leaflet.css', () => ({}));

vi.mock('leaflet', () => ({
  default: {
    Icon: {
      Default: {
        prototype: {},
        mergeOptions: vi.fn(),
      },
    },
  },
}));

type MarkerProps = {
  position: [number, number];
  eventHandlers?: { click?: () => void };
  children?: React.ReactNode;
};

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="map-container">{children}</div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ position, eventHandlers, children }: MarkerProps) => (
    <div data-lat={position[0]} data-lng={position[1]}>
      <button data-testid="marker" onClick={() => eventHandlers?.click?.()}>
        marker
      </button>
      {children}
    </div>
  ),
  Popup: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="popup">{children}</div>
  ),
  useMapEvents: () => ({
    getBounds: () => ({
      getNorth: () => 1,
      getSouth: () => 2,
      getEast: () => 3,
      getWest: () => 4,
    }),
  }),
}));

vi.mock('../PropertySummaryCard', () => ({
  default: ({
    property,
    onClose,
  }: {
    property: { title: string };
    onClose?: () => void;
  }) => (
    <div>
      <span>summary-for-{property.title}</span>
      <button onClick={onClose}>close-summary</button>
    </div>
  ),
}));

import PropertyMapView from '../PropertyMapView';

const baseProperties = [
  {
    id: 1,
    price: '$1,200',
    title: 'Cozy Studio',
    location: 'Victoria Island, Lagos',
    beds: 1,
    baths: 1,
    sqft: 500,
    image: 'https://example.com/1.jpg',
    latitude: 6.4281,
    longitude: 3.4219,
  },
  {
    id: 2,
    price: '$3,000',
    title: 'Family Home',
    location: 'Lekki, Lagos',
    beds: 4,
    baths: 3,
    sqft: 2000,
    image: 'https://example.com/2.jpg',
    latitude: 6.4654,
    longitude: 3.4738,
  },
  {
    id: 3,
    price: '$900',
    title: 'No Coordinates Listing',
    location: 'Unknown Area',
    beds: 2,
    baths: 1,
    sqft: 700,
    image: 'https://example.com/3.jpg',
  },
];

describe('PropertyMapView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the map container with a marker per property with coordinates', () => {
    render(
      React.createElement(PropertyMapView, { properties: baseProperties }),
    );

    expect(screen.getByTestId('map-container')).toBeInTheDocument();
    const markers = screen.getAllByTestId('marker');
    expect(markers).toHaveLength(2);
  });

  it('omits properties without latitude/longitude from the markers', () => {
    render(
      React.createElement(PropertyMapView, { properties: baseProperties }),
    );

    const markers = screen.getAllByTestId('marker');
    expect(markers).toHaveLength(2);
    expect(
      screen.queryByText(/No Coordinates Listing/),
    ).not.toBeInTheDocument();
  });

  it('renders an empty map when given no properties', () => {
    render(React.createElement(PropertyMapView, { properties: [] }));

    expect(screen.getByTestId('map-container')).toBeInTheDocument();
    expect(screen.queryByTestId('marker')).not.toBeInTheDocument();
  });

  it('shows a property summary popup when a marker is clicked', () => {
    render(
      React.createElement(PropertyMapView, { properties: baseProperties }),
    );

    const markers = screen.getAllByTestId('marker');
    fireEvent.click(markers[0]);

    expect(screen.getByText('summary-for-Cozy Studio')).toBeInTheDocument();
  });

  it('closes the popup when the summary card requests it', () => {
    render(
      React.createElement(PropertyMapView, { properties: baseProperties }),
    );

    const markers = screen.getAllByTestId('marker');
    fireEvent.click(markers[0]);
    expect(screen.getByText('summary-for-Cozy Studio')).toBeInTheDocument();

    fireEvent.click(screen.getByText('close-summary'));
    expect(
      screen.queryByText('summary-for-Cozy Studio'),
    ).not.toBeInTheDocument();
  });
});
