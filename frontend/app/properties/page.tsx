'use client';

export const dynamic = 'force-dynamic';

import nextDynamic from 'next/dynamic';
import Footer from '@/components/Footer';
import Navbar from '@/components/Navbar';
import PropertyCardSkeleton from '@/components/PropertyCardSkeleton';
import PropertyCard from '@/components/properties/PropertyCard';
import { PropertyListingHeader } from '@/components/properties/PropertyListingHeader';
import { Filter, Bell, List, Map, ChevronLeft } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Spinner } from '@/components/loading';
import {
  useInfiniteProperties,
  type PropertyListParams,
} from '@/lib/query/hooks/use-properties';
import { toPropertyCardShape } from '@/lib/utils/property-adapter';
import type { Property } from '@/types';

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
  const searchParams = useSearchParams();
  const router = useRouter();
  const [searchAsIMove, setSearchAsIMove] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [mapWidth, setMapWidth] = useState<number>(50);
  const [isMapCollapsed, setIsMapCollapsed] = useState(true);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  // ── Filter state (drives API query) ─────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState(
    () => searchParams.get('q') ?? '',
  );
  const [selectedType, setSelectedType] = useState<string>('');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');

  const observerTarget = useRef<HTMLDivElement>(null);

  // Build API filter params from local state
  const filterParams: Omit<PropertyListParams, 'page'> = {
    search: searchQuery.trim() || undefined,
    type: (selectedType || undefined) as PropertyListParams['type'],
    minPrice: minPrice ? Number(minPrice) : undefined,
    maxPrice: maxPrice ? Number(maxPrice) : undefined,
    limit: 12,
  };

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
  } = useInfiniteProperties(filterParams);

  // Flatten all pages into a single array
  const allProperties: Property[] = data?.pages.flatMap((p) => p.data) ?? [];

  useEffect(() => {
    setSearchQuery(searchParams.get('q') ?? '');
  }, [searchParams]);

  const applySearchToUrl = useCallback(
    (raw: string) => {
      const trimmed = raw.trim();
      const next = trimmed
        ? `/properties?q=${encodeURIComponent(trimmed)}`
        : '/properties';
      router.replace(next);
    },
    [router],
  );

  // Infinite scroll observer — calls API's next page
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Scroll detection for header visibility
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsHeaderVisible(currentScrollY <= lastScrollY);
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
    // Map bounds filtering is handled server-side via lat/lng/radiusKm params;
    // client-side fallback for already-loaded data:
    allProperties.filter((p) => {
      if (!p.latitude || !p.longitude) return false;
      return (
        p.latitude >= bounds.south &&
        p.latitude <= bounds.north &&
        p.longitude >= bounds.west &&
        p.longitude <= bounds.east
      );
    });
  };

  const toggleMapCollapse = () => setIsMapCollapsed((v) => !v);
  const adjustMapWidth = (delta: number) =>
    setMapWidth((prev) => Math.min(Math.max(prev + delta, 20), 80));

  // Total count: use first page metadata if available
  const totalCount = data?.pages[0]?.total ?? allProperties.length;

  return (
    <>
      <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <Navbar theme="dark" />

        {/* Header / Search bar */}
        <header
          className={`sticky top-0 z-40 glass-dark border-b border-white/10 shadow-lg transition-all duration-300 ${
            isHeaderVisible
              ? 'translate-y-0 opacity-100'
              : '-translate-y-full opacity-0 pointer-events-none'
          }`}
        >
          <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Filter controls */}
              <div className="flex flex-wrap items-center gap-2 relative">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      applySearchToUrl(searchQuery);
                    }
                  }}
                  placeholder="Search by location or property type..."
                  data-testid="property-search-input"
                  className="px-4 py-2 text-sm bg-slate-900/50 border border-white/10 rounded-xl text-white placeholder:text-blue-200/30 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                  aria-label="Search properties"
                />

                {/* Property Type dropdown */}
                <div className="relative group">
                  <button className="px-4 py-2 text-sm glass-card rounded-xl text-blue-100/80 hover:text-white font-medium">
                    {selectedType
                      ? selectedType.charAt(0).toUpperCase() +
                        selectedType.slice(1)
                      : 'Property Type'}
                  </button>
                  <div className="absolute top-full left-0 mt-2 min-w-[180px] bg-slate-900 border border-white/10 rounded-xl p-2 hidden group-hover:block z-50 shadow-2xl">
                    {[
                      '',
                      'apartment',
                      'house',
                      'commercial',
                      'land',
                      'other',
                    ].map((t) => (
                      <div
                        key={t}
                        onClick={() => setSelectedType(t)}
                        className={`px-3 py-2 text-sm rounded-lg cursor-pointer transition-colors ${
                          selectedType === t
                            ? 'bg-blue-600 text-white'
                            : 'text-blue-100/80 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {t === ''
                          ? 'All Types'
                          : t.charAt(0).toUpperCase() + t.slice(1)}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div className="relative group hidden md:block">
                  <button className="px-4 py-2 text-sm glass-card rounded-xl text-blue-100/80 hover:text-white font-medium">
                    Price Range
                  </button>
                  <div className="absolute top-full left-0 mt-2 bg-slate-900 border border-white/10 rounded-xl p-3 hidden group-hover:block z-50 shadow-2xl min-w-[240px]">
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        placeholder="Min"
                        value={minPrice}
                        onChange={(e) => setMinPrice(e.target.value)}
                        data-testid="page-min-price-input"
                        className="w-1/2 bg-slate-800 text-sm text-white px-3 py-2 rounded-lg border border-white/5 focus:outline-none"
                      />
                      <span className="text-white/30">-</span>
                      <input
                        type="number"
                        placeholder="Max"
                        value={maxPrice}
                        onChange={(e) => setMaxPrice(e.target.value)}
                        data-testid="page-max-price-input"
                        className="w-1/2 bg-slate-800 text-sm text-white px-3 py-2 rounded-lg border border-white/5 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* View & Actions */}
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center p-1 glass-dark rounded-xl border border-white/5 shadow-inner"
                  data-testid="view-toggle"
                >
                  <button
                    onClick={() => {
                      setViewMode('list');
                      setIsMapCollapsed(true);
                    }}
                    data-testid="view-toggle-list"
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
                    data-testid="view-toggle-split"
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
                    data-testid="view-toggle-map"
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
                <PropertyListingHeader count={totalCount} />

                {/* Error state */}
                {isError && (
                  <div
                    className="col-span-full text-center py-12 glass-card rounded-3xl border border-red-500/20 mb-8"
                    data-testid="error-state"
                  >
                    <p className="text-red-400 font-medium">
                      Failed to load listings.{' '}
                      {error instanceof Error
                        ? error.message
                        : 'Please try again.'}
                    </p>
                  </div>
                )}

                {/* Property Cards Grid */}
                <div
                  className="grid gap-6 mb-12 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
                  data-testid="property-grid"
                >
                  {isLoading
                    ? Array.from({ length: 8 }).map((_, i) => (
                        <PropertyCardSkeleton key={i} />
                      ))
                    : allProperties.length > 0
                      ? allProperties.map((property) => (
                          <PropertyCard
                            key={property.id}
                            property={toPropertyCardShape(property)}
                          />
                        ))
                      : !isError && (
                          <div
                            className="col-span-full text-center py-24 glass-card rounded-3xl border-dashed"
                            data-testid="empty-state"
                          >
                            <div className="text-blue-200/30 text-lg font-medium">
                              No properties match your current filters
                            </div>
                          </div>
                        )}

                  {/* Skeleton rows while fetching next page */}
                  {isFetchingNextPage &&
                    Array.from({ length: 4 }).map((_, i) => (
                      <PropertyCardSkeleton key={`next-${i}`} />
                    ))}
                </div>

                {/* Infinite scroll trigger */}
                <div ref={observerTarget} className="h-4" />

                {/* End of results indicator */}
                {!hasNextPage && allProperties.length > 0 && (
                  <p className="text-center text-blue-200/30 text-sm pb-8">
                    Showing all {totalCount} listings
                  </p>
                )}
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
                properties={allProperties.map(toPropertyCardShape)}
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
