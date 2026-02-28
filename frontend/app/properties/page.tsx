'use client';

import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import Footer from '@/components/Footer';
import Navbar from '@/components/Navbar';
import PropertyCardSkeleton from '@/components/PropertyCardSkeleton';
import PropertyCard from '@/components/properties/PropertyCard';
import SearchFilters from '@/components/properties/SearchFilters';
import {
  Heart,
  MapPin,
  Bed,
  Bath,
  Ruler,
  Filter,
  Bell,
  List,
  Map,
} from 'lucide-react';
import { useState, useEffect } from 'react';

const PropertyMapView = dynamic(
  () => import('@/components/properties/PropertyMapView'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center">
        <div className="text-gray-500">Loading map...</div>
      </div>
    ),
  },
);

type ViewMode = 'split' | 'list' | 'map';

export default function PropertyListing() {
  const [searchAsIMove, setSearchAsIMove] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('split');

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

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
    const filtered = properties.filter((p) => {
      if (!p.latitude || !p.longitude) return false;
      return (
        p.latitude >= bounds.south &&
        p.latitude <= bounds.north &&
        p.longitude >= bounds.west &&
        p.longitude <= bounds.east
      );
    });
    console.log('Properties in bounds:', filtered.length);
  };

  const filteredProperties = properties.filter((property) => {
    if (!searchQuery) return true;
    const lowerQuery = searchQuery.toLowerCase();
    return (
      property.title.toLowerCase().includes(lowerQuery) ||
      property.location.toLowerCase().includes(lowerQuery)
    );
  });

  return (
    <>
      <Navbar theme="light" />
      <div className="overflow-x-hidden">
        {/* Header/Search Bar */}
        <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
            <div className="flex flex-col gap-4 md:gap-0">
              <SearchFilters
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
              />

              {/* Filter Buttons and Actions */}
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                <button className="px-4 py-2 text-sm border border-gray-300 rounded-full hover:bg-gray-50 transition">
                  Price Range
                </button>
                <button className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-full border border-blue-300 hover:bg-blue-200 transition font-medium">
                  Property Type
                </button>
                <button className="px-4 py-2 text-sm border border-gray-300 rounded-full hover:bg-gray-50 transition">
                  Beds & Baths
                </button>
                <button className="px-4 py-2 text-sm border border-gray-300 rounded-full hover:bg-gray-50 transition hidden sm:inline-block">
                  Amenities
                </button>
                <div className="flex items-center gap-2 ml-auto shrink-0">
                  {/* View Toggle */}
                  <div className="flex items-center gap-0 border border-gray-300 rounded-lg overflow-hidden">
                    <button
                      onClick={() => setViewMode('list')}
                      className={`min-h-[44px] min-w-[44px] flex items-center justify-center px-3 py-2 text-sm transition ${
                        viewMode === 'list'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                      title="List View"
                    >
                      <List className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('split')}
                      className={`min-h-[44px] min-w-[44px] flex items-center justify-center px-3 py-2 text-sm transition ${
                        viewMode === 'split'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                      title="Split View"
                    >
                      <div className="flex gap-0.5">
                        <div className="w-1.5 h-3 bg-current rounded-l" />
                        <div className="w-1.5 h-3 bg-current rounded-r" />
                      </div>
                    </button>
                    <button
                      onClick={() => setViewMode('map')}
                      className={`min-h-[44px] min-w-[44px] flex items-center justify-center px-3 py-2 text-sm transition ${
                        viewMode === 'map'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                      title="Map View"
                    >
                      <Map className="w-4 h-4" />
                    </button>
                  </div>
                  <button className="flex items-center gap-1 px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                    <Filter className="w-4 h-4" />
                    <span className="hidden sm:inline">Filters</span>
                  </button>
                  <button className="flex items-center gap-1 px-4 py-2 text-sm text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition font-medium">
                    <Bell className="w-4 h-4" />
                    <span className="hidden sm:inline">Save Search</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div
          className={`flex gap-0 ${
            viewMode === 'split'
              ? 'flex-col lg:flex-row'
              : 'flex-col'
          }`}
        >
          {/* Listings Panel */}
          {(viewMode === 'list' || viewMode === 'split') && (
            <div
              className={`overflow-y-auto max-h-[calc(100vh-100px)] ${
                viewMode === 'split' ? 'w-full lg:w-2/5 xl:w-1/2' : 'w-full'
              }`}
            >
              <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Heading */}
                <div className="mb-6">
                  <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                    {filteredProperties.length} Global Stays
                  </h1>
                  <p className="text-gray-600 text-sm sm:text-base">
                    Check verified listings with smart lease support
                  </p>
                </div>

                {/* Verified Badge */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 sm:p-6 mb-8 flex gap-3 sm:gap-4">
                  <div className="shrink-0">
                    <svg
                      className="w-6 h-6 text-green-600"
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
                  <div>
                    <h3 className="font-semibold text-green-900 mb-1 text-sm sm:text-base">
                      Verified Blockchain Listings
                    </h3>
                    <p className="text-green-700 text-xs sm:text-sm">
                      All properties with the verified badge have been vetted
                      and are ready for instant smart contract leasing.
                    </p>
                  </div>
                </div>

                {/* Sort */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600 text-sm sm:text-base">
                      Sort by:
                    </span>
                    <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm sm:text-base bg-white text-gray-900 cursor-pointer hover:border-gray-400">
                      <option>Recommended</option>
                      <option>Price: Low to High</option>
                      <option>Price: High to Low</option>
                      <option>Newest</option>
                    </select>
                  </div>
                </div>

                {/* Property Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-4 mb-8">
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
                    <div className="col-span-1 sm:col-span-2 text-center py-12 text-gray-500">
                      No properties found matching your search.
                    </div>
                  )}
                </div>

                {/* Load More Button */}
                <div className="flex justify-center">
                  <button className="px-8 py-3 border-2 border-blue-600 text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition text-sm sm:text-base">
                    Load More Listings
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Map Panel */}
          {(viewMode === 'map' || viewMode === 'split') && (
            <div
              className={`h-96 lg:h-[calc(100vh-100px)] relative ${
                viewMode === 'split'
                  ? 'w-full lg:w-3/5 xl:w-1/2 lg:sticky lg:top-24'
                  : 'w-full'
              }`}
            >
              {/* Search as I Move Checkbox Overlay */}
              <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md rounded-full px-3 sm:px-4 py-2 sm:py-3 flex items-center gap-2 shadow-lg z-10 border border-black/5">
                <input
                  type="checkbox"
                  checked={searchAsIMove}
                  onChange={(e) => setSearchAsIMove(e.target.checked)}
                  className="w-4 h-4 rounded cursor-pointer accent-blue-600"
                />
                <label className="text-gray-700 text-xs sm:text-sm font-medium cursor-pointer select-none">
                  Search as I move the map
                </label>
              </div>
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
          )}
        </div>
      </div>

      <Footer />
    </>
  );
}