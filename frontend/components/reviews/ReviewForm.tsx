'use client';

import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { StarRatingInput } from './StarRatingInput';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const reviewSchema = z.object({
  rating: z.number().min(1, 'Please select a rating').max(5),
  comment: z
    .string()
    .min(10, 'Review must be at least 10 characters')
    .max(500, 'Review cannot exceed 500 characters'),
});

export type ReviewFormData = z.infer<typeof reviewSchema>;

interface ReviewFormProps {
  onSubmit: (data: ReviewFormData) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export function ReviewForm({
  onSubmit,
  onCancel,
  isSubmitting = false,
}: ReviewFormProps) {
  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
    reset,
  } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 0,
      comment: '',
    },
  });

  const ratingValue = useWatch({ control, name: 'rating' });
  const commentValue = useWatch({ control, name: 'comment' });

  const handleFormSubmit = async (data: ReviewFormData) => {
    try {
      await onSubmit(data);
      reset();
      toast.success('Review submitted successfully!');
    } catch (err) {
      toast.error('Failed to submit review');
      console.error(err);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="bg-white p-6 rounded-2xl shadow-xs border border-gray-100 flex flex-col gap-6"
    >
      <div>
        <label className="block text-sm font-semibold text-gray-900 mb-2">
          Rate your experience
        </label>
        <StarRatingInput
          value={ratingValue}
          onChange={(val) => setValue('rating', val, { shouldValidate: true })}
          size="lg"
        />
        {errors.rating && (
          <p className="mt-2 text-sm text-red-500 font-medium">
            {errors.rating.message}
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="comment"
          className="block text-sm font-semibold text-gray-900 mb-2"
        >
          Write a detailed review
        </label>
        <textarea
          id="comment"
          rows={4}
          className={`
            w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-brand-blue/20 focus:outline-hidden transition-all duration-200 resize-none
            ${
              errors.comment
                ? 'border-red-300 focus:border-red-500'
                : 'border-gray-200 focus:border-brand-blue hover:border-gray-300'
            }
          `}
          placeholder="Share details of your own experience at this place..."
          {...register('comment')}
        />
        <div className="flex justify-between items-center mt-2">
          {errors.comment ? (
            <p className="text-sm text-red-500 font-medium">
              {errors.comment.message}
            </p>
          ) : (
            <span className="text-xs text-gray-500">
              Your feedback will be published publicly.
            </span>
          )}
          <span className="text-xs font-medium text-gray-400">
            {commentValue.length}/500
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 justify-end pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting || ratingValue === 0}
          className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-brand-blue hover:bg-blue-700 shadow-md shadow-brand-blue/20 hover:shadow-lg hover:shadow-brand-blue/40 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[140px]"
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            'Submit Review'
          )}
        </button>
      </div>
    </form>
  );
}
