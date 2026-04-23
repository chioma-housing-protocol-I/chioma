'use client';

import { useQuery } from '@tanstack/react-query';
import { MapPin, Bed, Bath, Plus, Eye, Pencil, Building2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

function PropertyThumbnail({ src, alt }: { src?: string | null; alt: string }) {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div className="aspect-video bg-slate-700/60 flex items-center justify-center">
        <Building2 size={40} className="text-blue-300/20" />
      </div>
    );
  }

  return (
    <div className="aspect-video relative overflow-hidden bg-slate-700/60">
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        className="object-cover"
        onError={() => setError(true)}
      />
    </div>
  );
}

export default function HostListingsPage() {
  const { data: listings = [], isLoading } = useQuery({
    queryKey: ['host-listings'],
    queryFn: async () => {
      const res = await fetch('/api/properties?role=host');
      const data = await res.json();
      return data.data ?? data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Listings</h1>
          <p className="text-blue-300/60 mt-1">{listings.length} properties</p>
        </div>
        <Link
          href="/properties/new"
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all"
        >
          <Plus size={18} /> Add Listing
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <LoadingSpinner />
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-20 text-blue-300/60">
          <p className="text-xl mb-4">No listings yet</p>
          <Link
            href="/properties/new"
            className="text-blue-400 hover:underline"
          >
            Create your first listing →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map(
            (p: {
              id: string;
              title?: unknown;
              status?: unknown;
              city?: unknown;
              [key: string]: unknown;
            }) => (
              <div
                key={p.id}
                className="backdrop-blur-xl bg-slate-800/50 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all"
              >
                <PropertyThumbnail
                  src={
                    typeof p.imageUrl === 'string'
                      ? p.imageUrl
                      : typeof p.image === 'string'
                        ? p.image
                        : null
                  }
                  alt={typeof p.title === 'string' ? p.title : 'Property'}
                />
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold line-clamp-1">
                      {String(p.title)}
                    </h3>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ml-2 shrink-0 ${String(p.status) === 'published' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}
                    >
                      {String(p.status)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-blue-300/60 text-sm mb-3">
                    <MapPin size={12} />
                    <span>{String(p.city)}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-blue-200/60 mb-4">
                    <span className="flex items-center gap-1">
                      <Bed size={14} />
                      {String(p.bedrooms)}bd
                    </span>
                    <span className="flex items-center gap-1">
                      <Bath size={14} />
                      {String(p.bathrooms)}ba
                    </span>
                    <span className="ml-auto font-semibold text-white">
                      ${String(p.price)}/mo
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/stays/${p.id}`}
                      className="flex-1 flex items-center justify-center gap-1 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition-colors"
                    >
                      <Eye size={14} /> View
                    </Link>
                    <Link
                      href={`/properties/${p.id}/edit`}
                      className="flex-1 flex items-center justify-center gap-1 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 transition-colors"
                    >
                      <Pencil size={14} /> Edit
                    </Link>
                  </div>
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}
