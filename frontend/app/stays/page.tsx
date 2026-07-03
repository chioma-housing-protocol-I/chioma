'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Search, SlidersHorizontal, MapPin } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface StayProperty {
  id: string;
  title: string;
  city: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  type: string;
  image?: string;
  rating?: number;
  reviewCount?: number;
}

interface Filters {
  location: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  priceMin: number;
  priceMax: number;
}

async function fetchStays(filters: Filters): Promise<StayProperty[]> {
  const params = new URLSearchParams({
    city: filters.location,
    status: 'published',
    ...(filters.priceMax < 9999 && { maxPrice: String(filters.priceMax) }),
  });
  const res = await fetch(`/api/properties?${params}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.data ?? data ?? [];
}

export default function StaysPage() {
  const searchParams = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    location: searchParams.get('city') ?? '',
    checkIn: '',
    checkOut: '',
    guests: 1,
    priceMin: 0,
    priceMax: 9999,
  });

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['stays', filters],
    queryFn: () => fetchStays(filters),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      {/* Hero search bar */}
      <div className="bg-slate-900/80 border-b border-white/10 px-4 py-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold mb-6 text-center">
            Find your next stay
          </h1>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <MapPin
                className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-300/60"
                size={18}
              />
              <input
                type="text"
                placeholder="Where are you going?"
                value={filters.location}
                onChange={(e) =>
                  setFilters({ ...filters, location: e.target.value })
                }
                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-blue-300/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
            <input
              type="date"
              value={filters.checkIn}
              onChange={(e) =>
                setFilters({ ...filters, checkIn: e.target.value })
              }
              className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
            <input
              type="date"
              value={filters.checkOut}
              onChange={(e) =>
                setFilters({ ...filters, checkOut: e.target.value })
              }
              className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-3 bg-white/10 border border-white/10 rounded-xl hover:bg-white/20 transition-colors"
            >
              <SlidersHorizontal size={18} />
              <span className="hidden sm:inline">Filters</span>
            </button>
            <button className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all">
              <Search size={18} />
              <span>Search</span>
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-blue-300/60 mb-1">
                  Guests
                </label>
                <select
                  value={filters.guests}
                  onChange={(e) =>
                    setFilters({ ...filters, guests: Number(e.target.value) })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                >
                  {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                    <option key={n} value={n} className="bg-slate-800">
                      {n} guests
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-blue-300/60 mb-1">
                  Min Price
                </label>
                <input
                  type="number"
                  value={filters.priceMin}
                  onChange={(e) =>
                    setFilters({ ...filters, priceMin: Number(e.target.value) })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-blue-300/60 mb-1">
                  Max Price
                </label>
                <input
                  type="number"
                  value={filters.priceMax}
                  onChange={(e) =>
                    setFilters({ ...filters, priceMax: Number(e.target.value) })
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner />
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-20 text-blue-300/60">
            <p className="text-xl">
              No stays found. Try adjusting your filters.
            </p>
          </div>
        ) : (
          <>
            <p className="text-blue-300/60 mb-6">
              {properties.length} stays found
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {properties.map((p) => (
                <StayCard key={p.id} property={p} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StayCard({ property }: { property: StayProperty }) {
  return (
    <Link href={`/stays/${property.id}`} className="block group">
      <div className="backdrop-blur-xl bg-slate-800/50 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 hover:shadow-2xl transition-all duration-300">
        <div className="aspect-video bg-slate-700 relative overflow-hidden">
          {property.image ? (
            <Image
              src={property.image}
              alt={property.title}
              fill
              unoptimized
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-blue-300/30 text-4xl">
              🏠
            </div>
          )}
          <div className="absolute top-3 left-3 bg-blue-500/20 backdrop-blur-md text-blue-200 px-2 py-1 rounded-lg text-xs border border-blue-400/30">
            {property.type}
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-white line-clamp-1 mb-1">
            {property.title}
          </h3>
          <div className="flex items-center gap-1 text-blue-300/60 text-sm mb-3">
            <MapPin size={12} />
            <span>{property.city}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-bold text-lg bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              ${property.price}
              <span className="text-sm font-normal text-blue-300/60">
                /night
              </span>
            </span>
            <span className="text-xs text-blue-300/60">
              {property.bedrooms}bd · {property.bathrooms}ba
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
