"use client";

import { Heart, MapPin, Bed, Bath, Ruler, ChevronLeft } from "lucide-react";
import { useState } from "react";
import { useFavoriteStatus, useToggleFavorite } from "@/lib/query/hooks";
import { useModal } from "@/contexts/ModalContext";
import type {
  PropertyDetailData,
  PropertyInquiryData,
} from "@/components/modals/types";

interface PropertyCardProps {
  property: {
    id: number | string;
    price: string;
    title: string;
    location: string;
    category?: string;
    beds: number;
    baths: number;
    sqft: number;
    manager: string;
    image: string;
    verified: boolean;
    amenities?: string[];
    description?: string;
    latitude?: number;
    longitude?: number;
    images?: string[];
  };
  variant?: "grid" | "list";
}

export default function PropertyCard({
  property,
  variant = "grid",
}: PropertyCardProps) {
  const isList = variant === "list";
  const [imageError, setImageError] = useState(false);
  const { openModal } = useModal();
  const propertyId = String(property.id);
  const { data: favoriteStatus } = useFavoriteStatus(propertyId);
  const { isPending: isFavoritePending, toggleFavorite } =
    useToggleFavorite(propertyId);
  const isFavorited = favoriteStatus?.isFavorited ?? false;

  const handlePropertyClick = (e: React.MouseEvent) => {
    e.preventDefault();

    // Transform property data to PropertyDetailData format
    const propertyDetail: PropertyDetailData = {
      id: String(property.id),
      title: property.title,
      description:
        property.description ||
        `Beautiful ${property.category || "property"} in ${property.location}`,
      price: parseFloat(property.price.replace(/[^0-9.]/g, "")),
      address: property.location,
      bedrooms: property.beds,
      bathrooms: property.baths,
      areaSqft: property.sqft,
      landlordName: property.manager,
      images: property.images || [property.image],
      amenities: property.amenities || [],
      verificationStatus: property.verified ? "Verified" : undefined,
      viewCount: 0,
      favoriteCount: 0,
    };

    openModal("propertyDetail", {
      property: propertyDetail,
      onInquiryClick: (prop: PropertyDetailData) => {
        openModal("propertyInquiry", {
          propertyId: prop.id,
          propertyTitle: prop.title,
          landlordName: prop.landlordName,
        });
      },
    });
  };

  return (
    <div onClick={handlePropertyClick} className="block group cursor-pointer">
      <div
        className={`glass-card rounded-3xl overflow-hidden shadow-2xl transition-all duration-500 ${
          isList ? "flex flex-col sm:flex-row h-full" : "flex flex-col h-full"
        }`}
      >
        {/* Image Container */}
        <div
          className={`relative overflow-hidden cursor-pointer bg-slate-800 flex-shrink-0 ${
            isList ? "w-full sm:w-80 h-64 sm:h-auto" : "w-full aspect-[4/3]"
          }`}
        >
          {!imageError ? (
            <img
              src={property.image}
              alt={property.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              onError={() => setImageError(true)}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
              <div className="text-slate-500 text-sm">Image unavailable</div>
            </div>
          )}

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
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void toggleFavorite(isFavorited);
            }}
            disabled={isFavoritePending}
            aria-pressed={isFavorited}
            aria-label={
              isFavorited ? "Remove from favorites" : "Add to favorites"
            }
            className={[
              "absolute top-4 right-4 z-10 bg-slate-900/40 backdrop-blur-xl rounded-2xl p-3 hover:bg-white hover:text-red-500 text-white transition-all shadow-2xl active:scale-90 border border-white/10 group/heart disabled:opacity-60",
              isFavorited ? "text-red-400" : "",
            ].join(" ")}
          >
            <Heart
              className={[
                "w-5 h-5 transition-transform group-hover/heart:scale-110",
                isFavorited ? "fill-current" : "",
              ].join(" ")}
            />
          </button>
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

            <h3 className="font-black text-white mb-2 pt-2 text-xl sm:text-2xl leading-tight tracking-tight group-hover:text-blue-400 transition-colors line-clamp-1">
              {property.title}
            </h3>

            {/* Category Tag & Price */}
            <div className="flex items-center justify-between mb-4">
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border border-emerald-400/20">
                {property.category || "Apartment"}
              </span>
              <p className="text-white font-black text-xl tracking-tighter border-b border-white/10 pb-1">
                {property.price}
                <span className="text-blue-200/50 text-xs font-medium tracking-normal ml-1">
                  /mo
                </span>
              </p>
            </div>

            {/* Location */}
            <div className="flex items-start gap-2 text-blue-200/40 mb-5 text-sm font-medium">
              <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-blue-500" />
              <p className="line-clamp-1">{property.location}</p>
            </div>

            {/* Amenities Grid Output (If Provided) */}
            {property.amenities && property.amenities.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-5">
                {property.amenities.slice(0, 3).map((amenity, i) => (
                  <span
                    key={i}
                    className="text-[10px] bg-white/5 border border-white/10 text-blue-200/60 px-2 py-1 rounded-lg"
                  >
                    {amenity}
                  </span>
                ))}
              </div>
            )}

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
              <img
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${property.manager}`}
                alt={property.manager}
                className="w-10 h-10 rounded-2xl shrink-0 shadow-lg border border-white/10 group-hover/manager:scale-110 transition-transform"
              />
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
    </div>
  );
}
