'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BedDouble,
  Bath,
  Ruler,
  MessageCircle,
  Eye,
  Heart,
  ExternalLink,
  Zap,
  PawPrint,
  Car,
} from 'lucide-react';
import { BaseModal } from './BaseModal';
import type { PropertyDetailData } from './types';
import Image from 'next/image';
import {
  useRecordPropertyFavorite,
  useRecordPropertyView,
} from '@/lib/query/hooks/use-properties';

interface PropertyDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: PropertyDetailData | null;
  onInquiryClick?: (property: PropertyDetailData) => void;
}

export const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({
  isOpen,
  onClose,
  property,
  onInquiryClick,
}) => {
  const images = useMemo(
    () =>
      property?.images?.length
        ? property.images
        : ['https://images.unsplash.com/photo-1560185007-c5ca9d2c014d'],
    [property],
  );
  const [activeImage, setActiveImage] = useState(0);
  const viewRecordedRef = useRef(false);
  const { mutate: recordView } = useRecordPropertyView();
  const { mutate: recordFavorite, isPending: favoritePending } =
    useRecordPropertyFavorite();
  const [optimisticFavorites, setOptimisticFavorites] = useState<number | null>(
    null,
  );

  const displayedFavoriteCount =
    optimisticFavorites ?? property?.favoriteCount ?? null;

  useEffect(() => {
    if (!isOpen) {
      viewRecordedRef.current = false;
      return;
    }
    if (!property?.id || viewRecordedRef.current) return;
    viewRecordedRef.current = true;
    recordView(property.id, {
      onError: () => {
        viewRecordedRef.current = false;
      },
    });
  }, [isOpen, property?.id, recordView]);

  useEffect(() => {
    setOptimisticFavorites(null);
  }, [property?.id]);

  if (!property) return null;

  const handleFavorite = () => {
    recordFavorite(property.id, {
      onSuccess: (data) => setOptimisticFavorites(data.favoriteCount),
    });
  };

  const handleInquiry = () => {
    if (!onInquiryClick) return;
    onInquiryClick(property);
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={property.title}
      subtitle={property.address}
      size="xl"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <p className="text-sm text-neutral-500">
            Hosted by {property.landlordName}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleFavorite}
              disabled={favoritePending}
              className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-60"
            >
              <Heart size={16} />
              {favoritePending ? 'Saving…' : 'Favorite'}
            </button>
            <button
              type="button"
              onClick={handleInquiry}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <MessageCircle size={16} />
              Inquire
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="overflow-hidden rounded-2xl border border-neutral-200">
          <div className="relative h-72 w-full md:h-96">
            <Image
              src={images[activeImage]}
              alt={`${property.title} image ${activeImage + 1}`}
              fill
              unoptimized
              className="object-cover"
            />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {images.slice(0, 4).map((image, index) => (
            <button
              type="button"
              key={`${image}-${index}`}
              onClick={() => setActiveImage(index)}
              className={`overflow-hidden rounded-lg border ${
                activeImage === index
                  ? 'border-brand-blue'
                  : 'border-neutral-200'
              }`}
              aria-label={`Show image ${index + 1}`}
            >
              <div className="relative h-20 w-full">
                <Image
                  src={image}
                  alt={`Thumbnail ${index + 1}`}
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-600">
          {property.viewCount != null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 font-medium">
              <Eye size={14} className="text-brand-blue" />
              {property.viewCount.toLocaleString()} views
            </span>
          )}
          {displayedFavoriteCount != null && (
            <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 font-medium">
              <Heart size={14} className="text-rose-500" />
              {displayedFavoriteCount.toLocaleString()} favorites
            </span>
          )}
          {property.verificationStatus && (
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-800">
              {property.verificationStatus}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 rounded-2xl bg-neutral-50 p-4 md:grid-cols-4">
          <div className="flex items-center gap-2 text-sm font-medium text-neutral-700">
            <BedDouble size={16} className="text-brand-blue" />
            {property.bedrooms} Bedrooms
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-neutral-700">
            <Bath size={16} className="text-brand-blue" />
            {property.bathrooms} Bathrooms
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-neutral-700">
            <Ruler size={16} className="text-brand-blue" />
            {property.areaSqft || 0} sqft
          </div>
          <div className="text-sm font-bold text-green-600">
            ${property.price.toLocaleString()}/month
          </div>
        </div>

        {(property.energyRating ||
          property.petPolicy ||
          property.parkingSpaces != null) && (
          <div className="grid gap-2 rounded-2xl border border-neutral-200 p-4 text-sm text-neutral-700 md:grid-cols-3">
            {property.energyRating ? (
              <div className="flex items-center gap-2">
                <Zap size={16} className="text-amber-500" />
                <span>
                  <span className="font-semibold text-neutral-900">
                    Energy:{' '}
                  </span>
                  {property.energyRating}
                </span>
              </div>
            ) : null}
            {property.petPolicy ? (
              <div className="flex items-center gap-2">
                <PawPrint size={16} className="text-brand-blue" />
                <span>
                  <span className="font-semibold text-neutral-900">Pets: </span>
                  {property.petPolicy}
                </span>
              </div>
            ) : null}
            {property.parkingSpaces != null ? (
              <div className="flex items-center gap-2">
                <Car size={16} className="text-neutral-600" />
                <span>
                  <span className="font-semibold text-neutral-900">
                    Parking:{' '}
                  </span>
                  {property.parkingSpaces} space
                  {property.parkingSpaces === 1 ? '' : 's'}
                </span>
              </div>
            ) : null}
          </div>
        )}

        {(property.virtualTourUrl || property.videoUrl) && (
          <section className="space-y-2">
            <h4 className="text-base font-bold text-neutral-900">Tours & video</h4>
            <div className="flex flex-wrap gap-3">
              {property.virtualTourUrl ? (
                <a
                  href={property.virtualTourUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-brand-blue bg-white px-4 py-2 text-sm font-semibold text-brand-blue hover:bg-blue-50"
                >
                  <ExternalLink size={16} />
                  Virtual tour
                </a>
              ) : null}
              {property.videoUrl ? (
                <a
                  href={property.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"
                >
                  <ExternalLink size={16} />
                  Watch video
                </a>
              ) : null}
            </div>
          </section>
        )}

        {property.floorPlanUrl ? (
          <section className="space-y-2">
            <h4 className="text-base font-bold text-neutral-900">Floor plan</h4>
            <a
              href={property.floorPlanUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="relative block overflow-hidden rounded-xl border border-neutral-200"
            >
              <div className="relative h-48 w-full bg-neutral-100 md:h-64">
                <Image
                  src={property.floorPlanUrl}
                  alt={`${property.title} floor plan`}
                  fill
                  unoptimized
                  className="object-contain"
                />
              </div>
            </a>
          </section>
        ) : null}

        <section className="space-y-2">
          <h4 className="text-base font-bold text-neutral-900">
            About this property
          </h4>
          <p className="text-sm leading-6 text-neutral-600">
            {property.description}
          </p>
        </section>

        {!!property.amenities?.length && (
          <section className="space-y-2">
            <h4 className="text-base font-bold text-neutral-900">Amenities</h4>
            <div className="flex flex-wrap gap-2">
              {property.amenities.map((amenity) => (
                <span
                  key={amenity}
                  className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-brand-blue"
                >
                  {amenity}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>
    </BaseModal>
  );
};
