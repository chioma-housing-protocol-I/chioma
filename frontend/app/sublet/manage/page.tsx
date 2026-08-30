'use client';

import { useQuery } from '@tanstack/react-query';
import { CalendarDays, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { SkeletonCard } from '@/components/ui/SkeletonCard';

export default function SubletManagePage() {
  const { data: sublets = [], isLoading } = useQuery({
    queryKey: ['sublets'],
    queryFn: async () => {
      const res = await fetch('/api/subletting/requests');
      if (!res.ok) return [];
      const data = await res.json();
      return data.data ?? data ?? [];
    },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/sublet"
          className="inline-flex items-center gap-2 text-blue-300/60 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft size={18} /> Back
        </Link>
        <h1 className="text-3xl font-bold mb-8">Manage Sublets</h1>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : sublets.length === 0 ? (
          <div className="text-center py-20 text-blue-300/60">
            <p className="text-xl mb-4">No active sublets</p>
            <Link
              href="/sublet/request"
              className="text-blue-400 hover:underline"
            >
              Submit a request →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {sublets.map((s: { id: string; [key: string]: unknown }) => (
              <div
                key={s.id}
                className="backdrop-blur-xl bg-slate-800/50 border border-white/10 rounded-2xl p-5"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-semibold">
                    {String(s.propertyTitle) ?? 'Property'}
                  </h3>
                  <span
                    className={`text-xs px-3 py-1 rounded-full capitalize ${String(s.status) === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : String(s.status) === 'pending' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}
                  >
                    {String(s.status)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-blue-300/60">
                  <CalendarDays size={14} />
                  <span>
                    {String(s.startDate)} → {String(s.endDate)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
