'use client'

import Image from "next/image";
import Footer from '@/components/Footer'
import Navbar from '@/components/Properties-navbar'
import { Heart, MapPin, Bed, Bath, Ruler, Search, Filter, Bell, Plus, Minus, Compass } from 'lucide-react'
import { useState } from 'react'

export default function PropertyListing() {
  const [, setSelectedFilter] = useState('Property Type')
  const [searchAsIMove, setSearchAsIMove] = useState(true)

  const properties = [
    {
      id: 1,
      price: '₦2,500,000',
      title: 'Luxury 2-Bed Apartment',
      location: '101 Adeola Odeku St, Victoria Island, Lagos',
      beds: 2,
      baths: 2,
      sqft: 1200,
      manager: 'Sarah Okafor',
      image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=500&h=400&fit=crop',
      verified: true,
    },
    {
      id: 2,
      price: '₦3,800,000',
      title: 'Modern Loft in Lekki',
      location: 'Block 4, Admiralty Way, Lekki Phase 1',
      beds: 3,
      baths: 3,
      sqft: 1850,
      manager: 'David Ibrahim',
      image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=500&h=400&fit=crop',
      verified: true,
    },
    {
      id: 3,
      price: '₦1,500,000',
      title: 'Serviced Studio Flat',
      location: 'Glover Road, Ikoyi, Lagos',
      beds: 1,
      baths: 1,
      sqft: 600,
      manager: 'Chioma N.',
      image: 'https://images.unsplash.com/photo-1493857671505-72967e2e2760?w=500&h=400&fit=crop',
      verified: false,
    },
    {
      id: 4,
      price: '₦15,000,000',
      title: 'Exquisite 4-Bed Duplex',
      location: 'Banana Island, Ikoyi',
      beds: 4,
      baths: 5,
      sqft: 3200,
      manager: 'James Obi',
      image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=500&h=400&fit=crop',
      verified: true,
    },
    {
      id: 5,
      price: '₦800,000',
      title: 'Cozy 1-Bed Apartment',
      location: 'Yaba, Mainland, Lagos',
      beds: 1,
      baths: 1,
      sqft: 500,
      manager: 'Emmanuel K.',
      image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=500&h=400&fit=crop',
      verified: false,
    },
    {
      id: 6,
      price: '₦8,500,000',
      title: 'Penthouse with Sea View',
      location: 'Eko Atlantic City, Lagos',
      beds: 3,
      baths: 3,
      sqft: 2100,
      manager: 'Grace A.',
      image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500&h=400&fit=crop',
      verified: true,
    },
  ]

  const priceMarkers = [
    { price: '₦1,500,000', top: '20%', left: '60%' },
    { price: '₦2,500,000', top: '30%', left: '70%' },
    { price: '₦8,500,000', top: '40%', left: '75%' },
    { price: '₦3,800,000', top: '50%', left: '65%' },
    { price: '₦15,000,000', top: '65%', left: '55%' },
    { price: '₦800,000', top: '80%', left: '50%' },
  ]

  return (
    <>
      <Navbar />
      <div className="">
        {/* Header/Search Bar */}
        <header className=" top-0 bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col gap-4 md:gap-0">
              {/* Search Input */}
              <div className="flex items-center gap-2 bg-gray-50 rounded-full px-4 py-3 w-full md:w-80">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="City, neighborhood, or address"
                  className="bg-transparent outline-none flex-1 text-sm text-gray-700 placeholder-gray-400"
                />
              </div>

              {/* Filter Buttons and Actions */}
              <div className="flex flex-wrap items-center gap-2 md:gap-3">
                <button className="px-4 py-2 text-sm border border-gray-300 rounded-full hover:bg-gray-50 transition">
                  Price Range
                </button>
                <button
                  onClick={() => setSelectedFilter('Property Type')}
                  className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-full border border-blue-300 hover:bg-blue-200 transition font-medium"
                >
                  Property Type
                </button>
                <button className="px-4 py-2 text-sm border border-gray-300 rounded-full hover:bg-gray-50 transition">
                  Beds & Baths
                </button>
                <button className="px-4 py-2 text-sm border border-gray-300 rounded-full hover:bg-gray-50 transition hidden sm:inline-block">
                  Amenities
                </button>
                <div className="flex items-center gap-2 ml-auto">
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
        <div className="flex flex-col lg:flex-row gap-0">
          {/* Left Sidebar - Listings */}
          <div className="w-full lg:w-2/5 xl:w-1/2 overflow-y-auto max-h-[calc(100vh-100px)]">
            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {/* Heading */}
              <div className="mb-6">
                <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">342 Stays in Lagos</h1>
                <p className="text-gray-600 text-sm sm:text-base">Check verified listings with smart lease support</p>
              </div>

              {/* Verified Badge */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 sm:p-6 mb-8 flex gap-3 sm:gap-4">
                <div className="shrink-0">
                  <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-green-900 mb-1 text-sm sm:text-base">Verified Blockchain Listings</h3>
                  <p className="text-green-700 text-xs sm:text-sm">All properties with the verified badge have been vetted and are ready for instant smart contract leasing.</p>
                </div>
              </div>

              {/* Sort */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <span className="text-gray-600 text-sm sm:text-base">Sort by:</span>
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
                {properties.map((property) => (
                  <div
                    key={property.id}
                    className="border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow bg-white"
                  >
                    {/* Image */}
                    <div className="relative h-60 sm:h-56 bg-gray-200 overflow-hidden">
                      <Image
                        src={property.image || "/placeholder.svg"}
                        alt={property.title}
                        className="w-full h-full object-cover"
                        width={40}
                        height={40}
                      />
                      {/* Verified Badge */}
                      {property.verified && (
                        <div className="absolute top-4 left-4 bg-green-600 text-white px-3 py-1 rounded-full flex items-center gap-1 text-xs sm:text-sm font-medium">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          Verified
                        </div>
                      )}
                      {/* Wishlist Heart */}
                      <button className="absolute top-4 right-4 bg-white rounded-full p-2 hover:bg-gray-100 transition shadow">
                        <Heart className="w-5 h-5 text-gray-400 hover:text-red-500" />
                      </button>
                      {/* Lease Badge */}
                      <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded text-xs sm:text-sm font-medium">
                        Smart Lease Ready
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-4 sm:p-5">
                      {/* Price */}
                      <p className="text-blue-600 font-bold text-lg sm:text-xl mb-2">
                        {property.price} <span className="text-gray-500 font-normal text-sm">/yr</span>
                      </p>

                      {/* Title */}
                      <h3 className="font-bold text-gray-900 mb-2 text-sm sm:text-base">{property.title}</h3>

                      {/* Location */}
                      <div className="flex gap-2 text-gray-600 mb-4 text-xs sm:text-sm">
                        <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                        <p>{property.location}</p>
                      </div>

                      {/* Features */}
                      <div className="flex gap-4 sm:gap-6 mb-4 pb-4 border-b border-gray-200 text-gray-700 text-xs sm:text-sm">
                        <div className="flex items-center gap-1">
                          <Bed className="w-4 h-4" />
                          <span>{property.beds} Beds</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Bath className="w-4 h-4" />
                          <span>{property.baths} Baths</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Ruler className="w-4 h-4" />
                          <span>{property.sqft} sqft</span>
                        </div>
                      </div>

                      {/* Manager */}
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-linear-to-r from-pink-400 to-orange-400" />
                        <p className="text-xs sm:text-sm text-gray-700">
                          Managed by <span className="font-semibold">{property.manager}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Load More Button */}
              <div className="flex justify-center">
                <button className="px-8 py-3 border-2 border-blue-600 text-blue-600 font-semibold rounded-lg hover:bg-blue-50 transition text-sm sm:text-base">
                  Load More Listings
                </button>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Map */}
          <div className="w-full lg:w-3/5 xl:w-1/2 h-96 lg:h-[calc(100vh-100px)] bg-blue-200 relative top-20 lg:top-24 lg:sticky">
            {/* Map Background */}
            <div className="absolute inset-0 bg-linear-to-br from-blue-100 to-blue-200">
              <div className="absolute inset-0 opacity-50 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22><rect fill=%22white%22 width=%22100%22 height=%22100%22/><path d=%22M0 50 Q25 25 50 50 T100 50%22 stroke=%22%23e5e7eb%22 fill=%22none%22/></svg>')]" />
            </div>

            {/* Price Markers */}
            {priceMarkers.map((marker, index) => (
              <div
                key={index}
                className="absolute transform -translate-x-1/2 -translate-y-1/2"
                style={{ top: marker.top, left: marker.left }}
              >
                {marker.price === '₦3,800,000' ? (
                  <div className="bg-blue-600 text-white px-4 py-2 rounded-full font-bold text-xs sm:text-sm shadow-lg">
                    {marker.price}
                  </div>
                ) : (
                  <div className="bg-white text-blue-600 px-3 py-1 rounded-lg font-bold text-xs sm:text-sm shadow-md border border-blue-200">
                    {marker.price}
                  </div>
                )}
              </div>
            ))}

            {/* Search as I Move Checkbox */}
            <div className="absolute top-4 right-4 bg-white rounded-full px-3 sm:px-4 py-2 sm:py-3 flex items-center gap-2 shadow-lg z-10">
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

            {/* Map Controls */}
            <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
              <button className="bg-white rounded-lg p-2 hover:bg-gray-100 transition shadow-md hover:shadow-lg">
                <Plus className="w-5 h-5 text-gray-700" />
              </button>
              <button className="bg-white rounded-lg p-2 hover:bg-gray-100 transition shadow-md hover:shadow-lg">
                <Minus className="w-5 h-5 text-gray-700" />
              </button>
              <button className="bg-white rounded-lg p-2 hover:bg-gray-100 transition shadow-md hover:shadow-lg">
                <Compass className="w-5 h-5 text-gray-700" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </>

  )
}
