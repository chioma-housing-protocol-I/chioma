'use client';

import { useState, useCallback, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import PropertySummaryCard from './PropertySummaryCard';

// Fix for default marker icons in Next.js
import L from 'leaflet';

// Fix default marker icon issue (Next.js requires full paths)
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl:
      'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl:
      'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
}

interface Property {
  id: number | string;
  price: string;
  title: string;
  location: string;
  beds: number;
  baths: number;
  sqft: number;
  manager?: string;
  image: string;
  verified?: boolean;
  latitude?: number;
  longitude?: number;
}

interface PropertyMapViewProps {
  properties: Property[];
  onBoundsChange?: (bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }) => void;
  searchAsIMove?: boolean;
  initialViewState?: {
    longitude: number;
    latitude: number;
    zoom: number;
  };
}

// Default center for Lagos, Nigeria (based on the sample data)
const DEFAULT_CENTER: [number, number] = [6.5244, 3.3792];
const DEFAULT_ZOOM = 11;

// Component to handle map bounds changes
function MapBoundsHandler({
  onBoundsChange,
  searchAsIMove,
}: {
  onBoundsChange?: (bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }) => void;
  searchAsIMove?: boolean;
}) {
  const boundsChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const map = useMapEvents({
    moveend: () => {
      if (!onBoundsChange || !searchAsIMove) return;

      if (boundsChangeTimeoutRef.current) {
        clearTimeout(boundsChangeTimeoutRef.current);
      }

      boundsChangeTimeoutRef.current = setTimeout(() => {
        const bounds = map.getBounds();
        onBoundsChange({
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest(),
        });
      }, 500);
    },
    zoomend: () => {
      if (!onBoundsChange || !searchAsIMove) return;

      if (boundsChangeTimeoutRef.current) {
        clearTimeout(boundsChangeTimeoutRef.current);
      }

      boundsChangeTimeoutRef.current = setTimeout(() => {
        const bounds = map.getBounds();
        onBoundsChange({
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest(),
        });
      }, 500);
    },
  });

  return null;
}

export default function PropertyMapView({
  properties,
  onBoundsChange,
  searchAsIMove = true,
  initialViewState = {
    latitude: DEFAULT_CENTER[0],
    longitude: DEFAULT_CENTER[1],
    zoom: DEFAULT_ZOOM,
  },
}: PropertyMapViewProps) {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(
    null,
  );

  // Convert initialViewState to Leaflet format
  const center: [number, number] = [
    initialViewState.latitude,
    initialViewState.longitude,
  ];

  // Filter properties that have valid coordinates
  const propertiesWithCoords = properties.filter(
    (p) => p.latitude != null && p.longitude != null,
  );

  // Get property coordinates with fallback
  const getPropertyCoordinates = useCallback(
    (property: Property): [number, number] => {
      if (property.latitude && property.longitude) {
        return [property.latitude, property.longitude];
      }

      // Fallback: approximate coordinates for Lagos locations
      const locationMap: Record<string, [number, number]> = {
        'Victoria Island': [6.4281, 3.4219],
        Lekki: [6.4654, 3.4738],
        Ikoyi: [6.4484, 3.4356],
        Yaba: [6.4993, 3.3779],
        'Banana Island': [6.4444, 3.4333],
        'Eko Atlantic': [6.4167, 3.4167],
      };

      for (const [area, coords] of Object.entries(locationMap)) {
        if (property.location.includes(area)) {
          return coords;
        }
      }

      return DEFAULT_CENTER;
    },
    [],
  );

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={center}
        zoom={initialViewState.zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        className="z-0"
      >
        {/* OpenStreetMap Tile Layer - Free, no API key required! */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Handle bounds changes */}
        <MapBoundsHandler
          onBoundsChange={onBoundsChange}
          searchAsIMove={searchAsIMove}
        />

        {/* Property Markers */}
        {propertiesWithCoords.map((property) => {
          const coords = getPropertyCoordinates(property);
          return (
            <Marker
              key={property.id}
              position={coords}
              eventHandlers={{
                click: () => {
                  setSelectedProperty(property);
                },
              }}
            >
              {selectedProperty?.id === property.id && (
                <Popup
                  closeButton={true}
                  eventHandlers={{
                    remove: () => {
                      setSelectedProperty(null);
                    },
                  }}
                  className="property-popup"
                  maxWidth={400}
                >
                  <div className="w-full">
                    <PropertySummaryCard
                      property={property}
                      onClose={() => setSelectedProperty(null)}
                    />
                  </div>
                </Popup>
              )}
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
