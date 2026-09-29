'use client';

import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import { StarRatingInput } from './StarRatingInput';
import { Loader2, Fingerprint, Wallet, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { fieldA11yProps, fieldErrorId } from '@/lib/forms/a11y';
import { FormErrorSummary } from '@/components/forms/FormErrorSummary';
import {
  useTenantReview,
  useUpdateReview,
  useDeleteReview,
} from '@/lib/query/hooks/use-tenant-reviews';
import { useAuth } from '@/store/authStore';

const reviewSchema = z.object({
  rating: z.number().min(1, 'Please select a rating').max(5),
  comment: z
    .string()
    .min(10, 'Review must be at least 10 characters')
    .max(500, 'Review cannot exceed 500 characters'),
});

export type ReviewFormData = z.infer<typeof reviewSchema>;

interface ReviewFormProps {
  /**
   * Present -> edit mode: loads the existing review via useTenantReview,
   * submits through useUpdateReview, shows Delete, and requires a
   * connected wallet (this flow mints/updates an on-chain NFT rating).
   * Absent -> create mode: pure controlled form driven by onSubmit, no
   * data-fetching of its own (used by ReviewList for new reviews).
   */
  reviewId?: string;
  /** Required in create mode; ignored in edit mode (which uses useUpdateReview internally). */
  onSubmit?: (data: ReviewFormData) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export function ReviewForm({
  reviewId,
  onSubmit,
  onCancel,
  isSubmitting: isSubmittingProp = false,
}: ReviewFormProps) {
  const isEditMode = Boolean(reviewId);
  const router = useRouter();
  const { walletAddress } = useAuth();

  const { data: review, isLoading: isLoadingReview } = useTenantReview(
    reviewId || '',
  );
  const updateReviewMutation = useUpdateReview();
  const deleteReviewMutation = useDeleteReview();

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, submitCount, isSubmitting: isFormSubmitting },
    reset,
  } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 0,
      comment: '',
    },
  });

  useEffect(() => {
    if (isEditMode && review) {
      reset({ rating: review.rating, comment: review.comment });
    }
  }, [isEditMode, review, reset]);

  const ratingValue = useWatch({ control, name: 'rating' });
  const commentValue = useWatch({ control, name: 'comment' });
  const isSubmitting = isEditMode
    ? updateReviewMutation.isPending
    : isSubmittingProp || isFormSubmitting;

  const handleFormSubmit = async (data: ReviewFormData) => {
    if (isEditMode) {
      if (!reviewId) return;
      if (!walletAddress) {
        toast.error('Please connect your Web3 wallet to mint this rating.');
        return;
      }
      toast.loading('Confirming transaction & minting NFT rating on-chain...', {
        id: 'mint',
      });
      try {
        // Simulate blockchain minting interaction
        await new Promise((r) => setTimeout(r, 2000));
        await updateReviewMutation.mutateAsync({
          id: reviewId,
          payload: data,
        });
        toast.success('NFT Rating minted successfully!', { id: 'mint' });
        router.push('/user/reviews');
      } catch (error) {
        console.error('Failed to update review:', error);
        toast.error('Failed to mint NFT rating.', { id: 'mint' });
      }
      return;
    }

    if (!onSubmit) return;
    try {
      await onSubmit(data);
      reset();
      toast.success('Review submitted successfully!');
    } catch (err) {
      toast.error('Failed to submit review');
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!reviewId || !confirm('Delete this review? This cannot be undone.'))
      return;
    try {
      await deleteReviewMutation.mutateAsync(reviewId);
      router.push('/user/reviews');
    } catch (error) {
      console.error('Failed to delete review:', error);
    }
  };

  if (isEditMode && isLoadingReview) {
    return (
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-10 flex items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
        <span className="text-blue-200/50">Loading review...</span>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 shadow-2xl relative overflow-hidden group"
    >
      <div className="absolute -right-20 -top-20 w-48 h-48 rounded-full bg-blue-600 blur-[80px] opacity-10 group-hover:opacity-20 transition-opacity duration-500" />

      {isEditMode && (
        <div className="relative z-10">
          <h1 className="text-2xl font-black text-white tracking-tight">
            {review ? 'Edit Review' : 'Review Details'}
          </h1>
          <p className="text-blue-200/50 mt-1">
            {review ? 'Update your review below.' : 'View your review.'}
          </p>
        </div>
      )}

      <FormErrorSummary errors={errors} submitCount={submitCount} />

      <div className="relative z-10">
        <label
          id="rating-label"
          className="mb-3 block text-[10px] font-bold uppercase tracking-widest text-blue-200/60"
        >
          Rate your experience
        </label>
        <div
          role="group"
          aria-labelledby="rating-label"
          aria-invalid={errors.rating ? true : undefined}
          aria-describedby={errors.rating ? fieldErrorId('rating') : undefined}
          className="bg-white/5 rounded-xl p-3 border border-white/5 inline-block"
        >
          <StarRatingInput
            value={ratingValue}
            onChange={(val) =>
              setValue('rating', val, { shouldValidate: true })
            }
            size="lg"
          />
        </div>
        {errors.rating && (
          <p
            id={fieldErrorId('rating')}
            className="mt-2 text-xs font-bold text-red-400/80 uppercase tracking-tight"
          >
            {errors.rating.message}
          </p>
        )}
      </div>

      <div className="relative z-10">
        <label
          htmlFor="comment"
          className="mb-3 block text-[10px] font-bold uppercase tracking-widest text-blue-200/60"
        >
          Write a detailed review
        </label>
        <textarea
          rows={isEditMode ? 8 : 4}
          disabled={isSubmitting}
          className={`
            w-full resize-none rounded-xl border px-4 py-4 transition-all duration-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 text-sm font-medium disabled:opacity-50
            ${
              errors.comment
                ? 'border-red-500/30 bg-red-500/5 text-red-200'
                : 'border-white/10 bg-white/5 text-white focus:border-blue-500/40 hover:border-white/20'
            }
          `}
          placeholder={
            isEditMode
              ? 'Share your experience...'
              : 'Share details of your own experience at this place...'
          }
          {...register('comment')}
          {...fieldA11yProps('comment', errors.comment)}
        />
        <div className="mt-3 flex items-center justify-between">
          {errors.comment ? (
            <p
              id={fieldErrorId('comment')}
              className="text-xs font-bold text-red-400/80 uppercase tracking-tight"
            >
              {errors.comment.message}
            </p>
          ) : (
            <span className="text-[10px] font-bold text-emerald-300/60 uppercase tracking-widest flex items-center gap-1.5">
              <Fingerprint className="w-3 h-3" />
              Your feedback will be minted as an immutable NFT.
            </span>
          )}
          <span className="text-[10px] font-bold text-blue-200/40 uppercase tracking-widest">
            {commentValue.length}/500
          </span>
        </div>
      </div>

      <div className="flex flex-col-reverse gap-4 pt-4 sm:flex-row sm:justify-end relative z-10 border-t border-white/5">
        {isEditMode ? (
          <button
            type="button"
            onClick={() => router.push('/user/reviews')}
            disabled={isSubmitting}
            className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-blue-200/60 transition-all hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            Cancel
          </button>
        ) : (
          onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-blue-200/60 transition-all hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>
          )
        )}
        <button
          type="submit"
          disabled={isSubmitting || ratingValue === 0}
          className="flex min-w-[160px] items-center gap-2 justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-white transition-all hover:from-emerald-500 hover:to-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] disabled:cursor-not-allowed disabled:opacity-50 shadow-lg"
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Wallet className="w-4 h-4" />
              Mint NFT Rating
            </>
          )}
        </button>
        {isEditMode && review && (
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-red-400 transition-all hover:bg-red-500/20 disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        )}
      </div>
    </form>
  );
}
