'use client';

import {
  Wifi,
  Car,
  Wind,
  Droplet,
  Dumbbell,
  Shield,
  Tv,
  Coffee,
  Trees,
  Battery,
  LucideIcon,
  Check,
} from 'lucide-react';

// Simple map to try and match standard amenity names to icons
const iconMap: Record<string, LucideIcon> = {
  wifi: Wifi,
  internet: Wifi,
  parking: Car,
  garage: Car,
  ac: Wind,
  'air conditioning': Wind,
  pool: Droplet,
  gym: Dumbbell,
  fitness: Dumbbell,
  security: Shield,
  tv: Tv,
  cable: Tv,
  kitchen: Coffee,
  garden: Trees,
  power: Battery,
  generator: Battery,
  inverter: Battery,
};

export interface Amenity {
  name: string;
  icon?: string;
}

interface AmenitiesListProps {
  amenities: Amenity[];
}

export default function AmenitiesList({ amenities }: AmenitiesListProps) {
  if (!amenities || amenities.length === 0) {
    return (
      <div className="text-blue-200/70 italic text-sm py-4">
        No specific amenities listed for this property.
      </div>
    );
  }

  const getIcon = (name: string) => {
    const normalized = name.toLowerCase();
    // Try to find a direct match
    if (iconMap[normalized]) return iconMap[normalized];

    // Try to find a partial match
    const key = Object.keys(iconMap).find((k) => normalized.includes(k));
    if (key) return iconMap[key];

    // Fallback icon
    return Check;
  };

  return (
    <div className="mt-8">
      <h3 className="text-xl font-bold text-white mb-6">
        What this place offers
      </h3>
      <div className="flex flex-wrap gap-4">
        {amenities.map((amenity, idx) => {
          const IconComponent = getIcon(amenity.name);

          return (
            <div
              key={idx}
              className="flex items-center gap-2 backdrop-blur-xl bg-slate-800/50 border border-white/10 text-blue-200/90 px-5 py-2.5 rounded-full text-sm font-medium transition-all hover:bg-slate-700/50 hover:border-white/20 hover:shadow-lg"
            >
              <IconComponent size={18} className="text-blue-400" />
              <span>{amenity.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
