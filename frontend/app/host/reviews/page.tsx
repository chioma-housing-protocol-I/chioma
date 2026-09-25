'use client';

import { Star } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { SkeletonCard } from '@/components/ui/SkeletonCard';
import { EmptyState } from '@/components/ui/EmptyState';

export default function HostReviewsPage() {
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['host-reviews'],
    queryFn: async () => {
      const res = await fetch('/api/reviews?role=host');
      if (!res.ok) return [];
      const data = await res.json();
      return data.data ?? data ?? [];
    },
  });

  const avg = reviews.length
    ? (
        reviews.reduce(
          (s: number, r: { rating?: number }) => s + (r.rating ?? 0),
          0,
        ) / reviews.length
      ).toFixed(1)
    : '—';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Guest Reviews</h1>
        <div className="flex items-center gap-2 backdrop-blur-xl bg-slate-800/50 border border-white/10 rounded-xl px-4 py-2">
          <Star size={18} className="text-amber-400 fill-amber-400" />
          <span className="font-bold text-lg">{avg}</span>
          <span className="text-blue-300/60 text-sm">({reviews.length})</span>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <EmptyState
          icon={Star}
          title="No reviews yet"
          description="Guest reviews for your listings will appear here after they check out."
          variant="dark"
        />
      ) : (
        <div className="space-y-4">
          {reviews.map((r: { id: string; [key: string]: unknown }) => (
            <div
              key={r.id}
              className="backdrop-blur-xl bg-slate-800/50 border border-white/10 rounded-2xl p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold">
                    {String(r.reviewerName) ??
                      (r.reviewer as unknown as Record<string, unknown>)
                        ?.firstName ??
                      'Guest'}
                  </p>
                  <p className="text-sm text-blue-300/60">
                    {String(r.propertyTitle) ??
                      (r.property as unknown as Record<string, unknown>)?.title}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      className={
                        i < (Number(r.rating) ?? 0)
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-white/20'
                      }
                    />
                  ))}
                </div>
              </div>
              {Boolean(r.comment) && (
                <p className="text-blue-200/70 text-sm leading-relaxed">
                  {String(r.comment)}
                </p>
              )}
              <p className="text-xs text-blue-300/40 mt-3">
                {r.createdAt
                  ? new Date(String(r.createdAt)).toLocaleDateString()
                  : ''}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
