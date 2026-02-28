'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';
import L from 'leaflet';

// Fix for default Leaflet marker icons with Next.js/Webpack
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;

// Custom styling for the markers instead of default leaflet pins
const createCustomIcon = (price: string) => {
  // Extract number to determine formatting
  const numericPrice = parseInt(price.replace(/[^0-9]/g, ''));
  const isPremium = numericPrice > 3000;

  return L.divIcon({
    className: 'custom-leaflet-icon bg-transparent border-none outline-none',
    html: `<div class="${isPremium ? 'bg-brand-blue text-white' : 'bg-white text-brand-blue border border-brand-blue/20'} px-3 py-1.5 rounded-full font-bold text-sm shadow-xl flex items-center justify-center whitespace-nowrap transform -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-110 cursor-pointer isolate">
            ${price}
           </div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
};

interface Property {
  id: number;
  price: string;
  title: string;
  lat?: number;
  lng?: number;
}

interface PropertiesMapProps {
  properties: Property[];
}

function ChangeView({
  center,
  zoom,
}: {
  center: [number, number];
  zoom: number;
}) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 1.5, animate: true });
  }, [center, zoom, map]);
  return null;
}

export default function PropertiesMap({ properties }: PropertiesMapProps) {
  const validProperties = properties.filter(
    (p) => p.lat !== undefined && p.lng !== undefined,
  );

  // Center on first valid property or default to global view
  const center: [number, number] =
    validProperties.length > 0
      ? [validProperties[0].lat!, validProperties[0].lng!]
      : [20, 0];

  // Dynamic zoom based on results
  const zoom =
    validProperties.length === 1 ? 12 : validProperties.length > 1 ? 2 : 2;

  return (
    <div className="absolute inset-0 z-0">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
        zoomControl={false}
      >
        <ChangeView center={center} zoom={zoom} />
        {/* Sleek light base map perfectly matching the app theme */}
        <TileLayer
          attribution="&copy; OpenStreetMap"
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {validProperties.map((property) => (
          <Marker
            key={property.id}
            position={[property.lat!, property.lng!]}
            icon={createCustomIcon(property.price)}
          >
            <Popup className="rounded-xl overflow-hidden shadow-2xl border-none">
              <div className="p-1">
                <div className="font-bold text-gray-900 mb-1">
                  {property.title}
                </div>
                <div className="text-brand-blue text-lg font-black">
                  {property.price}{' '}
                  <span className="text-gray-500 text-xs font-medium">/mo</span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
