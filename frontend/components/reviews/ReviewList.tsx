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
    <div className="py-8 w-full max-w-5xl mx-auto flex flex-col gap-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 font-sans tracking-tight mb-2">
            {title}
          </h2>
          <p className="text-gray-600 text-lg">{subtitle}</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-full font-bold text-brand-blue bg-blue-50 hover:bg-blue-100 transition-colors duration-200 border border-blue-200 shadow-xs"
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        {reviews.length > 0 ? (
          reviews.map((review) => (
            <div key={review.id} className="h-full">
              <ReviewCard review={review} />
            </div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-gray-500 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            <p className="text-lg font-medium">No reviews yet.</p>
            <p className="text-sm">Be the first to share your experience!</p>
          </div>
        )}
      </div>
    </div>
  );
}
