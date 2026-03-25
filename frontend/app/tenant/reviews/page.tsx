'use client';

import { useEffect, useState } from 'react';
import { MessageSquareHeart, Star } from 'lucide-react';
import { ReviewList } from '@/components/reviews/ReviewList';
import type { ReviewFormData } from '@/components/reviews/ReviewForm';
import { useAuth } from '@/store/authStore';
import {
  buildRatingStats,
  type DashboardReview,
  loadReviewWorkspace,
  submitReview,
  type ReviewTarget,
} from '@/lib/dashboard-data';

export default function TenantReviewsPage() {
  const { user } = useAuth();
  const [targets, setTargets] = useState<ReviewTarget[]>([]);
  const [reviews, setReviews] = useState<DashboardReview[]>([]);

  useEffect(() => {
    let active = true;

    const run = async () => {
      const workspace = await loadReviewWorkspace('tenant');
      if (active) {
        setTargets(workspace.targets);
        setReviews(workspace.reviews);
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, [user?.id]);

  const handleSubmitReview = async (data: ReviewFormData) => {
    const activeTarget = targets[0];
    if (!activeTarget) return;

    await submitReview(activeTarget, data);

    setReviews((current) => [
      {
        id: `review-${Date.now()}`,
        rating: data.rating,
        comment: data.comment,
        createdAt: new Date().toISOString(),
        propertyName: activeTarget.propertyName,
        context: activeTarget.context,
        author: {
          id: user?.id ?? 'tenant-user',
          name: 'You',
          isVerified: true,
          role: 'TENANT',
        },
      },
      ...current,
    ]);

    setTargets((current) => current.slice(1));
  };

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] border border-slate-200 bg-linear-to-br from-white via-slate-50 to-blue-50 p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
          Reviews & Ratings
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          Publish lease and maintenance feedback from the tenant portal
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-600">
          Review workflows are now surfaced directly in the dashboard so tenants
          can rate landlords and service interactions instead of losing that
          feedback loop after checkout or issue resolution.
        </p>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50">
                <MessageSquareHeart className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Pending review prompts
                </p>
                <p className="text-sm text-slate-500">
                  Use the form below to submit the next due review.
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {targets.length === 0 ? (
                <p className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  No pending prompts right now.
                </p>
              ) : (
                targets.map((target) => (
                  <div
                    key={target.id}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-900">
                          {target.name}
                        </p>
                        <p className="text-sm text-slate-500">
                          {target.propertyName} • {target.context}
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {target.role}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {target.dueLabel}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100">
                <Star className="h-5 w-5 text-slate-700" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Feedback coverage
                </p>
                <p className="text-sm text-slate-500">
                  Track submitted reviews across lease and maintenance contexts.
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <InfoCard label="Submitted" value={`${reviews.length}`} />
              <InfoCard label="Pending" value={`${targets.length}`} />
            </div>
          </div>
        </div>
      </section>

      <ReviewList
        reviews={reviews}
        stats={buildRatingStats(reviews)}
        onSubmitReview={handleSubmitReview}
        title="Your review history"
        subtitle="Leave the next pending review and keep past feedback visible in one place."
      />
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
        {value}
      </p>
    </div>
  );
}
