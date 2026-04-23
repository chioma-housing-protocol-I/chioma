'use client';

export const dynamic = 'force-dynamic';

import nextDynamic from 'next/dynamic';
import Footer from '@/components/Footer';
import Navbar from '@/components/Navbar';
import PropertyCardSkeleton from '@/components/PropertyCardSkeleton';
import PropertyCard from '@/components/properties/PropertyCard';
import { PropertyListingHeader } from '@/components/properties/PropertyListingHeader';
import { Filter, Bell, List, Map, ChevronLeft } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { LOADING_KEYS, useLoading } from '@/store';
import { Spinner } from '@/components/loading';
import { MOCK_PROPERTIES } from '@/mocks/entities/properties';

const PropertyMapView = nextDynamic(
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
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [mapWidth, setMapWidth] = useState<number>(50);
  const [isMapCollapsed, setIsMapCollapsed] = useState(true);
  const [properties] = useState(MOCK_PROPERTIES);
  const [displayedCount, setDisplayedCount] = useState(12);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => {
      clearTimeout(timer);
      setLoading(false);
    };
  }, [setLoading]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && displayedCount < properties.length) {
          setDisplayedCount((prev) => Math.min(prev + 12, properties.length));
        }
      },
      { threshold: 0.1 },
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [displayedCount, properties.length]);

  // Scroll detection for header visibility
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY) {
        // Scrolling down - hide immediately
        setIsHeaderVisible(false);
      } else {
        // Scrolling up - show immediately
        setIsHeaderVisible(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

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
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <Navbar theme="dark" />
        {/* Header/Search Bar */}
        <header
          className={`sticky top-0 z-40 glass-dark border-b border-white/10 shadow-lg transition-all duration-300 ${
            isHeaderVisible
              ? 'translate-y-0 opacity-100'
              : '-translate-y-full opacity-0 pointer-events-none'
          }`}
        >
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Filter Buttons & Advanced Filters Merge */}
              <div className="flex flex-wrap items-center gap-2 relative">
                <input
                  type="text"
                  placeholder="Search by location..."
                  className="px-4 py-2 text-sm bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder:text-blue-200/30 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                />

                {/* Dropdown Filters Mimicking original styling */}
                <div className="relative group">
                  <button className="px-4 py-2 text-sm glass-card rounded-xl text-blue-100/80 hover:text-white font-medium">
                    Property Type
                  </button>
                  <div className="absolute top-full left-0 mt-2 min-w-[200px] bg-slate-900 border border-white/10 rounded-xl p-2 hidden group-hover:block z-50 shadow-2xl">
                    {[
                      'Hotel',
                      'Studio apartment',
                      'Student residence',
                      'Airbnb',
                      'Apartment',
                    ].map((category) => (
                      <div
                        key={category}
                        className="px-3 py-2 text-sm text-blue-100/80 hover:text-white hover:bg-white/5 rounded-lg cursor-pointer"
                      >
                        {category}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="relative group hidden sm:block">
                  <button className="px-4 py-2 text-sm glass-card rounded-xl text-blue-100/80 hover:text-white font-medium">
                    Availability
                  </button>
                  <div className="absolute top-full left-0 mt-2 bg-slate-900 border border-white/10 rounded-xl p-3 hidden group-hover:block z-50 shadow-2xl">
                    <input
                      type="date"
                      className="bg-slate-800 text-sm text-white px-3 py-2 rounded-lg border border-white/5 focus:outline-none w-full"
                    />
                  </div>
                </div>

                <div className="relative group hidden md:block">
                  <button className="px-4 py-2 text-sm glass-card rounded-xl text-blue-100/80 hover:text-white font-medium">
                    Price Range
                  </button>
                  <div className="absolute top-full left-0 mt-2 bg-slate-900 border border-white/10 rounded-xl p-3 hidden group-hover:block z-50 shadow-2xl min-w-[240px]">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        className="w-1/2 bg-slate-800 text-sm text-white px-3 py-2 rounded-lg border border-white/5 focus:outline-none"
                      />
                      <span className="text-white/30">-</span>
                      <input
                        type="number"
                        placeholder="Max"
                        className="w-1/2 bg-slate-800 text-sm text-white px-3 py-2 rounded-lg border border-white/5 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
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
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Listings Panel */}
          <div
            className="overflow-y-auto transition-all duration-500 ease-in-out bg-slate-900/50"
            style={{
              width: isMapCollapsed ? '100%' : `${100 - mapWidth}%`,
              display: viewMode === 'map' && !isMapCollapsed ? 'none' : 'block',
            }}
          >
            <div className="mx-auto px-2 sm:px-3 lg:px-4 py-8">
              <div className="max-w-[1600px] mx-auto">
                <PropertyListingHeader count={filteredProperties.length} />

                {/* Property Cards Grid */}
                <div className="grid gap-6 mb-12 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                  {isLoading ? (
                    <>
                      {Array.from({ length: 6 }).map((_, index) => (
                        <PropertyCardSkeleton key={index} />
                      ))}
                    </>
                  ) : filteredProperties.length > 0 ? (
                    filteredProperties
                      .slice(0, displayedCount)
                      .map((property) => (
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

                {/* Infinite scroll trigger */}
                <div ref={observerTarget} className="h-4" />
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
