'use client';

import { useQuery } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { EmptyState } from '@/components/ui/EmptyState';

interface Review {
  id: string;
  propertyTitle?: string;
  property?: { title?: string };
  rating?: number;
  comment?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export default function GuestReviewsPage() {
  const router = useRouter();
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['guest-reviews'],
    queryFn: async () => {
      const res = await fetch('/api/reviews?role=guest');
      if (!res.ok) return [];
      const data = await res.json();
      return data.data ?? data ?? [];
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">My Reviews</h1>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <EmptyState
          icon={Star}
          title="No reviews written yet"
          description="After your stay, you can leave a review for the host."
          actionLabel="View your trips"
          onAction={() => router.push('/guest/trips')}
          variant="dark"
        />
      ) : (
        <div className="space-y-4">
          {reviews.map((r: Review) => (
            <div
              key={r.id}
              className="backdrop-blur-xl bg-slate-800/50 border border-white/10 rounded-2xl p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <p className="font-semibold">
                  {r.propertyTitle ?? r.property?.title}
                </p>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      className={
                        i < (r.rating ?? 0)
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-white/20'
                      }
                    />
                  ))}
                </div>
              </div>
              {r.comment && (
                <p className="text-blue-200/70 text-sm">{r.comment}</p>
              )}
              <p className="text-xs text-blue-300/40 mt-3">
                {r.createdAt ? new Date(r.createdAt).toLocaleDateString() : ''}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
