'use client';

import Image from 'next/image';
import { Heart, MapPin, Bed, Bath, Ruler } from 'lucide-react';

interface PropertyCardProps {
  property: {
    id: number;
    price: string;
    title: string;
    location: string;
    beds: number;
    baths: number;
    sqft: number;
    manager: string;
    image: string;
    verified: boolean;
  };
}

export default function PropertyCard({ property }: PropertyCardProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-card hover:shadow-2xl transition-all duration-300 group">
      {/* Image Container */}
      <div className="relative aspect-4/3 sm:aspect-video bg-gray-200 overflow-hidden cursor-pointer">
        <Image
          src={property.image || '/placeholder.svg'}
          alt={property.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />

        {/* Status Badge */}
        {property.verified ? (
          <div className="absolute top-4 left-4 bg-green-600/90 backdrop-blur-md text-white px-3 py-1 rounded-full flex items-center gap-1.5 text-xs sm:text-sm font-semibold shadow-lg">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            Verified
          </div>
        ) : (
          <div className="absolute top-4 left-4 bg-brand-blue/90 backdrop-blur-md text-white px-3 py-1 rounded-full flex items-center gap-1.5 text-xs sm:text-sm font-semibold shadow-lg">
            Just Listed
          </div>
        )}

        {/* Wishlist Heart */}
        <button className="absolute top-4 right-4 bg-white/90 backdrop-blur-md rounded-full p-2.5 hover:bg-white hover:text-red-500 text-gray-400 transition-all shadow-lg active:scale-95">
          <Heart className="w-5 h-5" />
        </button>

        {/* Lease Badge */}
        <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-md text-white px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium border border-white/10 shadow-lg">
          Smart Lease Ready
        </div>
      </div>

      {/* Content Container */}
      <div className="p-5">
        {/* Price */}
        <p className="text-brand-blue font-bold text-xl sm:text-2xl mb-2 tracking-tight">
          {property.price}
          <span className="text-gray-500 font-medium text-sm sm:text-base tracking-normal ml-1">
            /mo
          </span>
        </p>

        {/* Title */}
        <h3 className="font-bold text-gray-900 mb-2.5 text-base sm:text-lg leading-snug cursor-pointer hover:text-brand-blue transition-colors line-clamp-1">
          {property.title}
        </h3>

        {/* Location */}
        <div className="flex items-start gap-1.5 text-gray-500 mb-5 text-sm">
          <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="line-clamp-1">{property.location}</p>
        </div>

        {/* Features Grid */}
        <div className="flex gap-4 sm:gap-6 mb-5 pb-5 border-b border-gray-100 text-gray-600 font-medium text-sm">
          <div className="flex items-center gap-1.5">
            <Bed className="w-4 h-4 text-brand-blue/70" />
            <span>{property.beds} Beds</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Bath className="w-4 h-4 text-brand-blue/70" />
            <span>{property.baths} Baths</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Ruler className="w-4 h-4 text-brand-blue/70" />
            <span>{property.sqft} sqft</span>
          </div>
        </div>

        {/* Manager / Footer */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-linear-to-tr from-brand-blue to-purple-500 shrink-0 shadow-sm" />
          <p className="text-sm text-gray-500 truncate">
            Managed by{' '}
            <span className="font-bold text-gray-900">{property.manager}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
