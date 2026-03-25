'use client';

import { useState } from 'react';
import { ReviewCard, type Review } from './ReviewCard';
import { RatingSummary, type RatingStats } from './RatingSummary';
import { ReviewForm, type ReviewFormData } from './ReviewForm';
import { PencilLine } from 'lucide-react';

interface ReviewListProps {
  reviews: Review[];
  stats: RatingStats;
  onSubmitReview: (data: ReviewFormData) => Promise<void>;
  title?: string;
  subtitle?: string;
}

export function ReviewList({
  reviews,
  stats,
  onSubmitReview,
  title = 'Guest Reviews',
  subtitle = 'See what people are saying about this place',
}: ReviewListProps) {
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: ReviewFormData) => {
    setIsSubmitting(true);
    try {
      await onSubmitReview(data);
      setShowForm(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 py-2 sm:py-4 transition-all duration-300">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="mb-2 text-3xl font-bold bg-gradient-to-r from-blue-300 to-indigo-300 bg-clip-text text-transparent">
            {title}
          </h2>
          <p className="max-w-2xl text-sm font-medium text-blue-200/60 leading-relaxed">
            {subtitle}
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600/20 border border-blue-500/30 px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest text-blue-400 transition-all hover:bg-blue-600 hover:text-white shadow-lg"
          >
            <PencilLine className="w-5 h-5" />
            Write a Review
          </button>
        )}
      </div>

      <RatingSummary stats={stats} />

      {showForm && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
          <ReviewForm
            onSubmit={handleSubmit}
            onCancel={() => setShowForm(false)}
            isSubmitting={isSubmitting}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 pt-2 md:grid-cols-2">
        {reviews.length > 0 ? (
          reviews.map((review) => (
            <div key={review.id} className="h-full">
              <ReviewCard review={review} />
            </div>
          ))
        ) : (
          <div className="col-span-full rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-12 text-center text-slate-500">
            <p className="text-lg font-medium">No reviews yet.</p>
            <p className="text-sm">Be the first to share your experience!</p>
          </div>
        )}
      </div>
    </div>
  );
}
