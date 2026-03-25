'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { ClipboardCheck, Star } from 'lucide-react';
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

export default function LandlordReviewsPage() {
  const { user } = useAuth();
  const [targets, setTargets] = useState<ReviewTarget[]>([]);
  const [reviews, setReviews] = useState<DashboardReview[]>([]);

  useEffect(() => {
    let active = true;

    const run = async () => {
      const workspace = await loadReviewWorkspace('landlord');
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
          id: user?.id ?? 'landlord-user',
          name: 'You',
          isVerified: true,
          role: 'LANDLORD',
        },
      },
      ...current,
    ]);

    setTargets((current) => current.slice(1));
  };

  return (
    <div className="space-y-10 pb-12">
      <section className="rounded-[2.5rem] border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-2xl relative overflow-hidden group">
        <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-blue-600 blur-[120px] opacity-10 group-hover:opacity-20 transition-opacity duration-700" />
        <div className="absolute -left-24 -bottom-24 w-72 h-72 rounded-full bg-slate-400 blur-[100px] opacity-10 group-hover:opacity-15 transition-opacity duration-700" />

        <div className="relative z-10">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-blue-400/80 mb-3">
            Review System
          </p>
          <h1 className="text-4xl font-black tracking-tight text-white leading-tight max-w-3xl">
            Capture tenant ratings{' '}
            <span className="text-blue-400">seamlessly</span> from your
            dashboard
          </h1>
          <p className="mt-4 max-w-2xl text-base font-medium text-blue-200/40 leading-relaxed">
            Integrated rating and feedback workflows for lease milestones and
            maintenance outcomes, transforming feedback into actionable
            insights.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <HeaderCard
              icon={<ClipboardCheck className="h-5 w-5 text-blue-400" />}
              label="Pending review prompts"
              value={`${targets.length}`}
            />
            <HeaderCard
              icon={<Star className="h-5 w-5 text-amber-400" />}
              label="Reviews submitted"
              value={`${reviews.length}`}
            />
          </div>
        </div>
      </section>

      <section className="rounded-[2.5rem] border border-white/10 bg-white/5 backdrop-blur-lg p-8 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">
              Upcoming review prompts
            </h2>
            <p className="mt-1 text-sm font-medium text-blue-200/40 leading-relaxed">
              Lease milestones and interactions awaiting your feedback.
            </p>
          </div>
          {targets.length > 0 && (
            <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-bold text-blue-400 uppercase tracking-widest">
              Action Required
            </span>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2 mt-4">
          {targets.length === 0 ? (
            <div className="col-span-full rounded-3xl border border-dashed border-white/10 bg-white/5 px-6 py-12 text-center">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                <ClipboardCheck className="w-6 h-6 text-blue-200/20" />
              </div>
              <p className="text-sm font-bold text-blue-200/20 uppercase tracking-widest">
                No pending prompts right now
              </p>
            </div>
          ) : (
            targets.map((target) => (
              <div
                key={target.id}
                className="rounded-3xl border border-white/10 bg-white/5 px-6 py-6 hover:bg-white/10 transition-all duration-300 group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">
                      {target.name}
                    </p>
                    <p className="text-sm font-medium text-blue-200/40 mt-1">
                      {target.propertyName}{' '}
                      <span className="mx-2 text-white/10">•</span>{' '}
                      {target.context}
                    </p>
                  </div>
                  <span className="rounded-xl bg-white/5 border border-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-200/60 transition-colors group-hover:border-blue-500/30 group-hover:text-blue-400">
                    {target.role}
                  </span>
                </div>
                <div className="mt-6 flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500/50 animate-pulse" />
                  <p className="text-[10px] font-bold text-blue-200/40 uppercase tracking-widest">
                    {target.dueLabel}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <ReviewList
        reviews={reviews}
        stats={buildRatingStats(reviews)}
        onSubmitReview={handleSubmitReview}
        title="Submitted landlord reviews"
        subtitle="Comprehensive feedback history for maintenance and lease interactions."
      />
    </div>
  );
}

function HeaderCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-xl hover:bg-white/10 transition-all duration-300 group">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 border border-white/10 group-hover:border-blue-500/30 transition-colors">
        {icon}
      </div>
      <p className="mt-5 text-[10px] font-bold uppercase tracking-widest text-blue-200/40">
        {label}
      </p>
      <p className="mt-2 text-4xl font-black tracking-tight text-white">
        {value}
      </p>
    </div>
  );
}
