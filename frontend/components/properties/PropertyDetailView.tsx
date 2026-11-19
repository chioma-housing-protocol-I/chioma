'use client';

import Image from 'next/image';
import { MapPin, User, ShieldCheck } from 'lucide-react';
import ImageGallery from './ImageGallery';
import AmenitiesList, { type Amenity } from './AmenitiesList';
import { ReviewList } from '@/components/reviews/ReviewList';
import type { Review } from '@/components/reviews/ReviewCard';
import type { RatingStats } from '@/components/reviews/RatingSummary';

export interface PropertyDetailData {
  id: string;
  title: string;
  description: string;
  price: string;
  location: string;
  status: 'AVAILABLE' | 'RENTED';
  images: string[];
  amenities: Amenity[];
  owner: {
    name: string;
    avatar?: string;
    contactInfo?: string;
  };
  rentalUnits: {
    total: number;
    available: number;
  };
  reviews: Review[];
  ratingStats: RatingStats;
}

interface PropertyDetailViewProps {
  property: PropertyDetailData;
  onInitializeLease?: () => void;
  onSubmitReview?: (rating: number, comment: string) => Promise<void>;
}

export default function PropertyDetailView({
  property,
  onInitializeLease,
  onSubmitReview,
}: PropertyDetailViewProps) {
  const isRented = property.status === 'RENTED';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      {/* Header section with title, location, gallery */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold font-sans bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent mb-4 tracking-tight">
          {property.title}
        </h1>
        <div className="flex items-start sm:items-center text-blue-200/80 mb-6 sm:mb-8 text-base sm:text-lg font-medium gap-2">
          <MapPin className="w-5 h-5 shrink-0 text-blue-400 mt-0.5 sm:mt-0" />
          <span>{property.location}</span>
        </div>

        <ImageGallery images={property.images} title={property.title} />
      </div>

      {/* Details 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 relative items-start">
        {/* Left Column (Main Content - roughly 66%) */}
        <div className="lg:col-span-8 flex flex-col gap-10">
          {/* Units Status */}
          <div className="backdrop-blur-xl bg-blue-500/10 border border-blue-400/30 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
            <div>
              <h3 className="text-xl font-bold text-white">Rental Units</h3>
              <p className="text-blue-200/70 mt-1">
                Smart Contract execution enabled for transparent leasing.
              </p>
            </div>
            <div className="flex gap-4">
              <div className="backdrop-blur-xl bg-slate-800/50 border border-white/10 px-4 py-2 rounded-xl shadow-sm text-center">
                <span className="block text-2xl font-black text-white">
                  {property.rentalUnits.total}
                </span>
                <span className="text-xs font-semibold text-blue-200/70 uppercase tracking-wider">
                  Total
                </span>
              </div>
              <div className="backdrop-blur-xl bg-slate-800/50 border border-white/10 px-4 py-2 rounded-xl shadow-sm text-center">
                <span
                  className={`block text-2xl font-black ${property.rentalUnits.available > 0 ? 'text-green-400' : 'text-red-400'}`}
                >
                  {property.rentalUnits.available}
                </span>
                <span className="text-xs font-semibold text-blue-200/70 uppercase tracking-wider">
                  Available
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="text-2xl font-bold text-white mb-4">
              About this property
            </h3>
            <p className="text-blue-200/80 leading-relaxed text-lg">
              {property.description}
            </p>
          </div>

          {/* Amenities */}
          <hr className="border-white/10" />
          <AmenitiesList amenities={property.amenities} />
          <hr className="border-white/10" />

          {/* Landlord Info */}
          <div className="flex items-center gap-6 p-6 rounded-2xl backdrop-blur-xl bg-slate-800/50 border border-white/10 shadow-lg">
            <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 overflow-hidden flex items-center justify-center shrink-0 shadow-lg">
              {property.owner.avatar ? (
                <Image
                  src={property.owner.avatar}
                  alt={property.owner.name}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="text-white w-8 h-8" />
              )}
            </div>
            <div>
              <h4 className="text-xl font-bold text-white mb-1">
                Managed by {property.owner.name}
              </h4>
              <div className="flex items-center text-sm font-medium text-emerald-300 bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 rounded-full w-fit">
                <ShieldCheck className="w-4 h-4 mr-1.5" />
                {property.owner.contactInfo || 'Verified Source'}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (Sticky CTA - roughly 33%) */}
        <div className="lg:col-span-4 sticky top-24 lg:top-32 w-full">
          <div className="backdrop-blur-xl bg-slate-800/50 border border-white/10 shadow-2xl rounded-3xl p-5 sm:p-8">
            {/* Price */}
            <div className="mb-8 pb-6 border-b border-white/10">
              <span className="block text-sm font-semibold text-blue-200/70 mb-1 uppercase tracking-wider">
                Rent Price
              </span>
              <div className="flex items-end gap-2 bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent font-extrabold text-4xl">
                {property.price}
                <span className="text-lg font-medium text-blue-200/70 mb-1">
                  /year
                </span>
              </div>
            </div>

            {/* Status Badges */}
            {isRented && (
              <div className="mb-6 bg-red-500/20 text-red-300 px-4 py-3 rounded-xl font-bold text-center border border-red-400/30 flex items-center justify-center backdrop-blur-sm">
                <span className="w-2 h-2 bg-red-400 rounded-full mr-2 animate-pulse" />
                Property Not Available
              </div>
            )}
            {!isRented && (
              <div className="mb-6 bg-emerald-500/20 text-emerald-300 px-4 py-3 rounded-xl font-bold text-center border border-emerald-400/30 flex items-center justify-center backdrop-blur-sm">
                <span className="w-2 h-2 bg-emerald-400 rounded-full mr-2" />
                Available for Smart Lease
              </div>
            )}

            {/* Action Button */}
            <button
              disabled={isRented}
              onClick={onInitializeLease}
              className={`w-full py-4 rounded-full font-bold text-lg transition-all transform duration-200
                ${
                  isRented
                    ? 'bg-slate-700/50 text-slate-400 cursor-not-allowed border border-white/10'
                    : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-xl shadow-blue-600/20 hover:shadow-blue-600/40 hover:-translate-y-0.5 active:translate-y-0'
                }`}
            >
              {isRented ? 'Currently Rented' : 'Initialize Rent Agreement'}
            </button>

            {!isRented && (
              <p className="text-center text-xs text-blue-200/70 mt-4 font-medium flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                Powered by secure Smart Contracts
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Reviews Section at the bottom */}
      <div className="mt-20 pt-10 border-t border-white/10">
        <ReviewList
          reviews={property.reviews}
          stats={property.ratingStats}
          title="Tenant Reviews"
          subtitle="See what past and current tenants say about this property"
          onSubmitReview={onSubmitReview}
        />
      </div>
    </div>
  );
}
