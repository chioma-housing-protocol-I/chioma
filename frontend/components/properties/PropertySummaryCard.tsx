'use client';

import Image from 'next/image';
import Link from 'next/link';
import { MapPin, Bed, Bath, Ruler, Heart } from 'lucide-react';
import { useState } from 'react';

interface PropertySummaryCardProps {
  property: {
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
  };
  onClose?: () => void;
}

export default function PropertySummaryCard({
  property,
  onClose,
}: PropertySummaryCardProps) {
  const [isFavorite, setIsFavorite] = useState(false);

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden w-full max-w-sm border border-gray-200">
      {/* Image */}
      <div className="relative h-48 bg-gray-200 overflow-hidden">
        <Image
          src={property.image || '/placeholder.svg'}
          alt={property.title}
          className="w-full h-full object-cover"
          width={400}
          height={300}
        />
        {/* Verified Badge */}
        {property.verified && (
          <div className="absolute top-3 left-3 bg-green-600 text-white px-3 py-1 rounded-full flex items-center gap-1 text-xs font-medium">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            Verified
          </div>
        )}
        {/* Wishlist Heart */}
        <button
          onClick={(e) => {
            e.preventDefault();
            setIsFavorite(!isFavorite);
          }}
          className="absolute top-3 right-3 bg-white rounded-full p-2 hover:bg-gray-100 transition shadow"
        >
          <Heart
            className={`w-5 h-5 ${
              isFavorite ? 'text-red-500 fill-red-500' : 'text-gray-400'
            }`}
          />
        </button>
        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-3 right-12 bg-white rounded-full p-2 hover:bg-gray-100 transition shadow"
          >
            <svg
              className="w-5 h-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Price */}
        <p className="text-blue-600 font-bold text-xl mb-2">
          {property.price}{' '}
          <span className="text-gray-500 font-normal text-sm">/yr</span>
        </p>

        {/* Title */}
        <Link href={`/properties/${property.id}`}>
          <h3 className="font-bold text-gray-900 mb-2 text-base hover:text-blue-600 transition">
            {property.title}
          </h3>
        </Link>

        {/* Location */}
        <div className="flex gap-2 text-gray-600 mb-3 text-sm">
          <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="line-clamp-1">{property.location}</p>
        </div>

        {/* Features */}
        <div className="flex gap-4 mb-3 pb-3 border-b border-gray-200 text-gray-700 text-sm">
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
        {property.manager && (
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-pink-400 to-orange-400" />
            <p className="text-sm text-gray-700">
              Managed by{' '}
              <span className="font-semibold">{property.manager}</span>
            </p>
          </div>
        )}

        {/* View Details Button */}
        <Link
          href={`/properties/${property.id}`}
          className="block w-full text-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm"
        >
          View Details
        </Link>
      </div>
    </div>
  );
}
