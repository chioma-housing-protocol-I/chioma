'use client';

import React, { useMemo, useState } from 'react';
import { BedDouble, Bath, Ruler, MessageCircle } from 'lucide-react';
import { BaseModal } from './BaseModal';
import type { PropertyDetailData } from './types';
import Image from 'next/image';

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

  if (!property) return null;

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
