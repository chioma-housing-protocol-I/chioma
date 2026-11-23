'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, Bed, Bath, Car, PawPrint } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Breadcrumb } from '@/components/common/Breadcrumb';

async function fetchProperty(id: string) {
  const res = await fetch(`/api/properties/${id}`);
  if (!res.ok) return null;
  return res.json();
}

export default function StayDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: property, isLoading } = useQuery({
    queryKey: ['property', id],
    queryFn: () => fetchProperty(id),
    enabled: !!id,
  });

  if (isLoading)
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );

  if (!property)
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center text-white">
        Property not found.
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Breadcrumb
          backHref="/stays"
          backLabel="Back to stays"
          homeHref="/"
          homeLabel="Home"
          customLabels={{
            [id]: property.title || 'Stay Details',
          }}
          className="mb-6"
        />

        {/* Image */}
        <div className="relative aspect-video bg-slate-700 rounded-2xl overflow-hidden mb-8">
          {property.images?.[0]?.url ? (
            <Image
              src={property.images[0].url}
              alt={property.title}
              fill
              unoptimized
              className="object-cover"
              sizes="(max-width: 1280px) 100vw, 1280px"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-blue-300/30 text-6xl">
              🏠
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Details */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">{property.title}</h1>
              <div className="flex items-center gap-2 text-blue-300/60">
                <MapPin size={16} />
                <span>
                  {property.address}, {property.city}
                </span>
              </div>
            </div>

            <div className="flex gap-6 py-4 border-y border-white/10">
              <div className="flex items-center gap-2 text-blue-200/80">
                <Bed size={18} className="text-blue-400" />
                <span>{property.bedrooms} bedrooms</span>
              </div>
              <div className="flex items-center gap-2 text-blue-200/80">
                <Bath size={18} className="text-blue-400" />
                <span>{property.bathrooms} bathrooms</span>
              </div>
            </div>

            {property.description && (
              <div>
                <h2 className="text-xl font-semibold mb-3">About this place</h2>
                <p className="text-blue-200/70 leading-relaxed">
                  {property.description}
                </p>
              </div>
            )}

            {property.amenities?.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-3">Amenities</h2>
                <div className="grid grid-cols-2 gap-3">
                  {property.amenities.map((a: { id: string; name: string }) => (
                    <div
                      key={a.id}
                      className="flex items-center gap-2 text-blue-200/70"
                    >
                      <span className="w-2 h-2 rounded-full bg-blue-400" />
                      {a.name}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-4">
              {property.petsAllowed && (
                <div className="flex items-center gap-2 text-emerald-400 text-sm">
                  <PawPrint size={16} /> Pets allowed
                </div>
              )}
              {property.hasParking && (
                <div className="flex items-center gap-2 text-emerald-400 text-sm">
                  <Car size={16} /> Parking available
                </div>
              )}
            </div>
          </div>

          {/* Booking card */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 backdrop-blur-xl bg-slate-800/50 border border-white/10 rounded-2xl p-6">
              <div className="text-2xl font-bold mb-1">
                <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                  ${property.price}
                </span>
                <span className="text-sm font-normal text-blue-300/60">
                  {' '}
                  / night
                </span>
              </div>

              <div className="space-y-3 my-4">
                <div>
                  <label className="block text-xs text-blue-300/60 mb-1">
                    Check-in
                  </label>
                  <input
                    type="date"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-blue-300/60 mb-1">
                    Check-out
                  </label>
                  <input
                    type="date"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-blue-300/60 mb-1">
                    Guests
                  </label>
                  <select className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n} className="bg-slate-800">
                        {n} guest{n > 1 ? 's' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <Link
                href={`/stays/book/${id}`}
                className="block w-full text-center py-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all"
              >
                Reserve
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
