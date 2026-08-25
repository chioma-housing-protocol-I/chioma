'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, MapPin, Users, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PropertyCardSkeleton from '@/components/properties/PropertyCardSkeleton';
import { EmptyState } from '@/components/ui/EmptyState';

const TABS = [
  { label: 'Upcoming', value: 'confirmed' },
  { label: 'Past', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

interface Trip {
  id: string;
  propertyTitle?: string;
  property?: { title?: string; city?: string; id?: string };
  city?: string;
  checkInDate?: string;
  startDate?: string;
  guests?: number;
  propertyId?: string;
  [key: string]: unknown;
}

export default function GuestTripsPage() {
  const router = useRouter();
  const [tab, setTab] = useState('confirmed');

  const { data: trips = [], isLoading } = useQuery({
    queryKey: ['guest-trips', tab],
    queryFn: async () => {
      const res = await fetch(`/api/bookings?role=guest&status=${tab}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.data ?? data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">My Trips</h1>

      <div className="flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === t.value
                ? 'bg-blue-500 text-white'
                : 'bg-white/5 border border-white/10 text-blue-200/70 hover:bg-white/10'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <PropertyCardSkeleton key={i} />
          ))}
        </div>
      ) : trips.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No trips here"
          description="Once you book a stay, it will show up here so you can track upcoming and past trips."
          actionLabel="Browse stays"
          onAction={() => router.push('/stays')}
          variant="dark"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {trips.map((trip: Trip) => (
            <div
              key={trip.id}
              className="backdrop-blur-xl bg-slate-800/50 border border-white/10 rounded-2xl overflow-hidden hover:border-white/20 transition-all"
            >
              <div className="aspect-video bg-slate-700 flex items-center justify-center text-4xl text-blue-300/20">
                🏠
              </div>
              <div className="p-5">
                <h3 className="font-semibold mb-1">
                  {trip.propertyTitle ?? trip.property?.title ?? 'Property'}
                </h3>
                <div className="flex items-center gap-1 text-blue-300/60 text-sm mb-3">
                  <MapPin size={12} />
                  <span>{trip.city ?? trip.property?.city}</span>
                </div>
                <div className="flex gap-4 text-sm text-blue-200/60 mb-4">
                  <span className="flex items-center gap-1">
                    <CalendarDays size={14} />
                    {trip.checkInDate ?? trip.startDate}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users size={14} />
                    {trip.guests ?? 1} guests
                  </span>
                </div>
                <Link
                  href={`/stays/${trip.propertyId ?? trip.property?.id}`}
                  className="flex items-center justify-center gap-2 w-full py-2 bg-white/5 border border-white/10 rounded-xl text-sm hover:bg-white/10 transition-colors"
                >
                  View property <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
