'use client';

import dynamic from 'next/dynamic';
import Footer from '@/components/Footer';
import Navbar from '@/components/Navbar';
import PropertyCardSkeleton from '@/components/PropertyCardSkeleton';
import PropertyCard from '@/components/properties/PropertyCard';
import { Filter, Bell, List, Map, ChevronLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import { LOADING_KEYS, useLoading } from '@/store';
import { Spinner, LoadingButton } from '@/components/loading';

const PropertyMapView = dynamic(
  () => import('@/components/properties/PropertyMapView'),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gray-100 text-gray-600">
        <Spinner size="lg" label="Loading map" />
        <span className="text-sm">Loading map…</span>
      </div>
    ),
  },
);

type ViewMode = 'split' | 'list' | 'map';

export default function PropertyListing() {
  const [searchAsIMove, setSearchAsIMove] = useState(true);
  const { isLoading, setLoading } = useLoading(LOADING_KEYS.pageProperties);
  const [loadMoreLoading, setLoadMoreLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [mapWidth, setMapWidth] = useState<number>(50); // percentage in split view
  const [isMapCollapsed, setIsMapCollapsed] = useState(false);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => {
      clearTimeout(timer);
      setLoading(false);
    };
  }, [setLoading]);

  const [properties] = useState([
    {
      id: 1,
      price: '$2,500',
      title: 'Luxury 2-Bed Apartment',
      location: '101 Park Avenue, Manhattan, New York',
      beds: 2,
      baths: 2,
      sqft: 1200,
      manager: 'Sarah Okafor',
      image:
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=500&h=400&fit=crop',
      verified: true,
      latitude: 40.7128,
      longitude: -74.006,
    },
    {
      id: 2,
      price: '$3,800',
      title: 'Modern Loft in Kensington',
      location: 'High Street Kensington, London',
      beds: 3,
      baths: 3,
      sqft: 1850,
      manager: 'David Ibrahim',
      image:
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=500&h=400&fit=crop',
      verified: true,
      latitude: 51.5014,
      longitude: -0.1919,
    },
    {
      id: 3,
      price: '$1,500',
      title: 'Serviced Studio Flat',
      location: 'Shibuya City, Tokyo, Japan',
      beds: 1,
      baths: 1,
      sqft: 600,
      manager: 'Chioma N.',
      image:
        'https://images.unsplash.com/photo-1493857671505-72967e2e2760?w=500&h=400&fit=crop',
      verified: false,
      latitude: 35.662,
      longitude: 139.7038,
    },
    {
      id: 4,
      price: '$15,000',
      title: 'Exquisite 4-Bed Penthouse',
      location: 'Palm Jumeirah, Dubai, UAE',
      beds: 4,
      baths: 5,
      sqft: 3200,
      manager: 'James Obi',
      image:
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=500&h=400&fit=crop',
      verified: true,
      latitude: 25.1124,
      longitude: 55.139,
    },
    {
      id: 5,
      price: '$800',
      title: 'Cozy 1-Bed Apartment',
      location: 'Neukölln, Berlin, Germany',
      beds: 1,
      baths: 1,
      sqft: 500,
      manager: 'Emmanuel K.',
      image:
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=500&h=400&fit=crop',
      verified: false,
      latitude: 52.4811,
      longitude: 13.4357,
    },
    {
      id: 6,
      price: '$8,500',
      title: 'Penthouse with Sea View',
      location: 'Bondi Beach, Sydney, Australia',
      beds: 3,
      baths: 3,
      sqft: 2100,
      manager: 'Grace A.',
      image:
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500&h=400&fit=crop',
      verified: true,
      latitude: -33.8908,
      longitude: 151.2743,
    },
  ]);

  const handleBoundsChange = (bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  }) => {
    if (!searchAsIMove) return;
    const _filtered = properties.filter((p) => {
      if (!p.latitude || !p.longitude) return false;
      return (
        p.latitude >= bounds.south &&
        p.latitude <= bounds.north &&
        p.longitude >= bounds.west &&
        p.longitude <= bounds.east
      );
    });
  };

  const filteredProperties = properties;

  const toggleMapCollapse = () => {
    setIsMapCollapsed(!isMapCollapsed);
  };

  const adjustMapWidth = (delta: number) => {
    setMapWidth((prev) => Math.min(Math.max(prev + delta, 20), 80));
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <Navbar theme="dark" />
        {/* Header/Search Bar */}
        <header className="sticky top-0 z-40 glass-dark border-b border-white/10 shadow-lg">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Filter Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button className="px-4 py-2 text-sm glass-card rounded-xl text-blue-100/80 hover:text-white font-medium">
                  Price Range
                </button>
                <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-semibold shadow-blue-500/20 shadow-lg">
                  Property Type
                </button>
                <button className="px-4 py-2 text-sm glass-card rounded-xl text-blue-100/80 hover:text-white font-medium">
                  Beds & Baths
                </button>
                <button className="px-4 py-2 text-sm glass-card rounded-xl text-blue-100/80 hover:text-white font-medium hidden lg:inline-block">
                  Amenities
                </button>
              </div>

              {/* View & Actions */}
              <div className="flex items-center gap-3">
                <div className="flex items-center p-1 glass-dark rounded-xl border border-white/5 shadow-inner">
                  <button
                    onClick={() => {
                      setViewMode('list');
                      setIsMapCollapsed(true);
                    }}
                    className={`p-2 rounded-lg transition-all ${
                      viewMode === 'list'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-blue-200/60 hover:text-white hover:bg-white/5'
                    }`}
                    title="List View"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setViewMode('split');
                      setIsMapCollapsed(false);
                      setMapWidth(50);
                    }}
                    className={`p-2 rounded-lg transition-all ${
                      viewMode === 'split' && !isMapCollapsed
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-blue-200/60 hover:text-white hover:bg-white/5'
                    }`}
                    title="Split View"
                  >
                    <div className="flex gap-0.5">
                      <div className="w-1.5 h-3 bg-current rounded-sm" />
                      <div className="w-1.5 h-3 bg-current rounded-sm" />
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setViewMode('map');
                      setIsMapCollapsed(false);
                      setMapWidth(100);
                    }}
                    className={`p-2 rounded-lg transition-all ${
                      viewMode === 'map'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-blue-200/60 hover:text-white hover:bg-white/5'
                    }`}
                    title="Map View"
                  >
                    <Map className="w-4 h-4" />
                  </button>
                </div>

                <div className="h-6 w-px bg-white/10 mx-1" />

                <button className="flex items-center gap-2 px-4 py-2 text-sm glass-card rounded-xl text-blue-100/80 hover:text-white font-medium">
                  <Filter className="w-4 h-4" />
                  <span className="hidden sm:inline">Filters</span>
                </button>
                <button className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-500/10 text-blue-400 border border-blue-400/20 rounded-xl hover:bg-blue-500/20 transition-all font-semibold">
                  <Bell className="w-4 h-4" />
                  <span className="hidden sm:inline">Save</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex h-[calc(100vh-80px)] overflow-hidden">
          {/* Listings Panel */}
          <div
            className="overflow-y-auto transition-all duration-500 ease-in-out bg-slate-900/50"
            style={{
              width: isMapCollapsed ? '100%' : `${100 - mapWidth}%`,
              display: viewMode === 'map' && !isMapCollapsed ? 'none' : 'block',
            }}
          >
            <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {/* Heading */}
              <div className="mb-8">
                <h1 className="text-3xl sm:text-5xl font-black text-gradient mb-3 tracking-tighter">
                  {filteredProperties.length} Premium Stays
                </h1>
                <p className="text-blue-200/50 text-base sm:text-lg max-w-xl leading-relaxed">
                  Discover luxury blockchain-verified properties with seamless
                  smart contract leasing.
                </p>
              </div>

              {/* Verified Badge */}
              <div className="glass-card rounded-2xl p-6 mb-10 flex gap-5 shadow-2xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-emerald-500/5 group-hover:bg-emerald-500/10 transition-colors" />
                <div className="shrink-0 relative">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center border border-emerald-400/30">
                    <svg
                      className="w-6 h-6 text-emerald-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>
                <div className="relative">
                  <h3 className="font-bold text-emerald-100 mb-1 text-lg">
                    Blockchain Verified
                  </h3>
                  <p className="text-emerald-200/50 text-sm max-w-md">
                    Securely vetted listings ready for instant deployment using
                    on-chain smart contracts.
                  </p>
                </div>
              </div>

              {/* Sort and Filters */}
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-white/5">
                <div className="flex items-center gap-4">
                  <span className="text-blue-200/40 text-sm font-semibold uppercase tracking-widest">
                    Sorted by
                  </span>
                  <select className="bg-transparent text-white font-bold text-sm cursor-pointer focus:outline-none hover:text-blue-400 transition-colors">
                    <option className="bg-slate-900">Recommended</option>
                    <option className="bg-slate-900">Price: Low to High</option>
                    <option className="bg-slate-900">Price: High to Low</option>
                    <option className="bg-slate-900">Newest First</option>
                  </select>
                </div>
              </div>

              {/* Property Cards Grid */}
              <div
                className={`grid gap-6 mb-12 ${
                  isMapCollapsed || mapWidth < 40
                    ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                    : 'grid-cols-1 md:grid-cols-2'
                }`}
              >
                {isLoading ? (
                  <>
                    {Array.from({ length: 6 }).map((_, index) => (
                      <PropertyCardSkeleton key={index} />
                    ))}
                  </>
                ) : filteredProperties.length > 0 ? (
                  filteredProperties.map((property) => (
                    <PropertyCard key={property.id} property={property} />
                  ))
                ) : (
                  <div className="col-span-full text-center py-24 glass-card rounded-3xl border-dashed">
                    <div className="text-blue-200/30 text-lg font-medium">
                      No properties match your current filters
                    </div>
                  </div>
                )}
              </div>

              {/* Load More Button */}
              <div className="flex justify-center">
                <LoadingButton
                  loading={loadMoreLoading}
                  onClick={() => {
                    setLoadMoreLoading(true);
                    setTimeout(() => setLoadMoreLoading(false), 1200);
                  }}
                  className="rounded-xl bg-blue-600 px-10 py-4 text-sm font-bold text-white shadow-xl shadow-blue-500/20 transition-all hover:bg-blue-700 hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                  Load More Stays
                </LoadingButton>
              </div>
            </div>
          </div>

          {/* Map Panel */}
          <div
            className="relative transition-all duration-500 ease-in-out border-l border-white/5 bg-[#0f172a]"
            style={{
              width: isMapCollapsed ? '0%' : `${mapWidth}%`,
              opacity: isMapCollapsed ? 0 : 1,
              pointerEvents: isMapCollapsed ? 'none' : 'auto',
            }}
          >
            {/* Map Controls */}
            {!isMapCollapsed && (
              <div className="absolute top-6 left-6 z-10 flex flex-col gap-2">
                <div className="glass-dark rounded-xl p-1 shadow-2xl border border-white/10 flex items-center gap-1">
                  <button
                    onClick={() => adjustMapWidth(-10)}
                    className="p-2 text-blue-200/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    title="Expand Listings"
                  >
                    <List className="w-4 h-4 rotate-180" />
                  </button>
                  <div className="h-6 w-px bg-white/10" />
                  <button
                    onClick={() => adjustMapWidth(10)}
                    className="p-2 text-blue-200/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    title="Expand Map"
                  >
                    <Map className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Collapse Toggle */}
            <button
              onClick={toggleMapCollapse}
              className={`absolute top-1/2 -left-4 z-20 flex h-12 w-8 -translate-y-1/2 items-center justify-center glass-dark border border-white/10 rounded-l-xl transition-all hover:scale-105 active:scale-95 shadow-2xl ${
                isMapCollapsed ? 'left-0 rounded-r-xl rounded-l-none' : ''
              }`}
            >
              <div
                className={`transition-transform duration-500 ${
                  isMapCollapsed ? 'rotate-180' : ''
                }`}
              >
                <ChevronLeft className="w-4 h-4 text-white" />
              </div>
            </button>

            {/* Search as I Move Checkbox Overlay */}
            <div className="absolute top-6 right-6 backdrop-blur-2xl bg-slate-900/40 rounded-2xl px-5 py-3 flex items-center gap-3 shadow-2xl z-10 border border-white/10 group cursor-pointer hover:bg-slate-900/60 transition-all">
              <input
                type="checkbox"
                id="searchMove"
                checked={searchAsIMove}
                onChange={(e) => setSearchAsIMove(e.target.checked)}
                className="w-5 h-5 rounded-lg cursor-pointer accent-blue-600 border-white/20 bg-slate-800"
              />
              <label
                htmlFor="searchMove"
                className="text-white text-sm font-bold cursor-pointer select-none tracking-tight group-hover:text-blue-200 transition-colors"
              >
                Search as I move
              </label>
            </div>

            <div className="h-full w-full">
              <PropertyMapView
                properties={filteredProperties}
                onBoundsChange={handleBoundsChange}
                searchAsIMove={searchAsIMove}
                initialViewState={{
                  longitude: 0,
                  latitude: 20,
                  zoom: 2,
                }}
              />
            </div>
          </div>
        </div>

        <Footer />
      </div>
    </>
  );
}
