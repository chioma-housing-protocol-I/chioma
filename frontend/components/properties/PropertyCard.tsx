'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart, MapPin, Bed, Bath, Ruler, ChevronLeft } from 'lucide-react';

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
  variant?: 'grid' | 'list';
}

export default function PropertyCard({
  property,
  variant = 'grid',
}: PropertyCardProps) {
  const isList = variant === 'list';

  return (
    <Link href={`/properties/${property.id}`} className="block group">
      <div
        className={`glass-card rounded-3xl overflow-hidden shadow-2xl transition-all duration-500 hover:shadow-blue-500/10 ${
          isList ? 'flex flex-col sm:flex-row h-full' : 'flex flex-col h-full'
        }`}
      >
        {/* Image Container */}
        <div
          className={`relative overflow-hidden cursor-pointer ${
            isList ? 'w-full sm:w-80 h-64 sm:h-auto shrink-0' : 'aspect-[4/3]'
          }`}
        >
          <Image
            src={property.image || '/placeholder.svg'}
            alt={property.title}
            fill
            sizes={
              isList
                ? '(max-width: 640px) 100vw, 320px'
                : '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
            }
            className="object-cover transition-transform duration-700 group-hover:scale-110"
          />

          {/* Status Badge */}
          <div className="absolute top-4 left-4 z-10">
            {property.verified ? (
              <div className="bg-emerald-500/20 backdrop-blur-xl text-emerald-400 px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs font-black uppercase tracking-widest border border-emerald-400/30 shadow-2xl">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Verified
              </div>
            ) : (
              <div className="bg-blue-600 backdrop-blur-xl text-white px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs font-black uppercase tracking-widest border border-blue-400/30 shadow-2xl">
                New Listing
              </div>
            )}
          </div>

          {/* Wishlist Heart */}
          <button className="absolute top-4 right-4 z-10 bg-slate-900/40 backdrop-blur-xl rounded-2xl p-3 hover:bg-white hover:text-red-500 text-white transition-all shadow-2xl active:scale-90 border border-white/10 group/heart">
            <Heart className="w-5 h-5 transition-transform group-hover/heart:scale-110" />
          </button>

          {/* Price Overlay (on grid mode) */}
          {!isList && (
            <div className="absolute bottom-4 left-4 right-4 z-10">
              <div className="glass-dark rounded-2xl p-4 border border-white/5 shadow-2xl">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-white font-black text-2xl tracking-tighter">
                      {property.price}
                      <span className="text-blue-200/50 text-sm font-medium tracking-normal ml-1">
                        /mo
                      </span>
                    </p>
                    <p className="text-blue-200/60 text-xs font-bold uppercase tracking-widest mt-1">
                      Smart Lease Ready
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content Container */}
        <div className="p-6 flex-1 flex flex-col">
          <div className="flex-1">
            {isList && (
              <div className="flex justify-between items-start mb-4">
                <p className="text-white font-black text-3xl tracking-tighter">
                  {property.price}
                  <span className="text-blue-200/50 text-sm font-medium tracking-normal ml-1">
                    /mo
                  </span>
                </p>
                <div className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded-lg text-xs font-bold border border-blue-400/20">
                  Smart Lease
                </div>
              </div>
            )}

            <h3 className="font-black text-white mb-2 text-xl sm:text-2xl leading-tight tracking-tight group-hover:text-blue-400 transition-colors line-clamp-1">
              {property.title}
            </h3>

            {/* Location */}
            <div className="flex items-start gap-2 text-blue-200/40 mb-6 text-sm font-medium">
              <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
              <p className="line-clamp-1">{property.location}</p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-3 gap-4 mb-8 pb-6 border-b border-white/5 text-blue-100 font-bold text-xs uppercase tracking-widest">
              <div className="flex flex-col gap-2 items-center sm:items-start">
                <Bed className="w-5 h-5 text-blue-500" />
                <span>{property.beds} Beds</span>
              </div>
              <div className="flex flex-col gap-2 items-center sm:items-start">
                <Bath className="w-5 h-5 text-blue-500" />
                <span>{property.baths} Baths</span>
              </div>
              <div className="flex flex-col gap-2 items-center sm:items-start">
                <Ruler className="w-5 h-5 text-blue-500" />
                <span>{property.sqft} sqft</span>
              </div>
            </div>
          </div>

          {/* Manager / Footer */}
          <div className="flex items-center justify-between group/manager cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 shrink-0 shadow-lg border border-white/10 group-hover/manager:scale-110 transition-transform" />
              <div>
                <p className="text-[10px] text-blue-200/30 font-black uppercase tracking-[0.2em]">
                  Managed by
                </p>
                <p className="text-sm font-bold text-white leading-none mt-0.5">
                  {property.manager}
                </p>
              </div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center group-hover/manager:bg-blue-600 transition-colors">
              <ChevronLeft className="w-4 h-4 text-white rotate-180" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
