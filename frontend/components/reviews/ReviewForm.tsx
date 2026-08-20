'use client';

import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { StarRatingInput } from './StarRatingInput';
import { Loader2, Fingerprint, Wallet, Trash2 } from 'lucide-react';
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
  /** Prefill values for edit mode (e.g. loading an existing review by id) */
  initialValues?: ReviewFormData;
  /** When provided, renders a destructive delete action */
  onDelete?: () => Promise<void> | void;
  /** Disable the delete action while an in-flight delete request runs */
  isDeleting?: boolean;
  /** Optional heading shown above the form (e.g. "Edit Review") */
  title?: string;
  /** Optional description shown under the heading */
  description?: string;
  /** Custom label for the submit button (defaults to "Mint NFT Rating") */
  submitLabel?: string;
  /** Show "cancel" as a plain back action instead of a button (edit flows) */
  cancelLabel?: string;
}

export function ReviewForm({
  onSubmit,
  onCancel,
  isSubmitting = false,
  initialValues,
  onDelete,
  isDeleting = false,
  title,
  description,
  submitLabel = 'Mint NFT Rating',
  cancelLabel = 'Cancel',
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
      rating: initialValues?.rating ?? 0,
      comment: initialValues?.comment ?? '',
    },
  });

  // Re-seed the form whenever edit mode receives new initial values
  // (e.g. the review finished loading from the API).
  useEffect(() => {
    if (initialValues) {
      reset({ rating: initialValues.rating, comment: initialValues.comment });
    }
  }, [initialValues, reset]);

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

  const handleDelete = async () => {
    if (!onDelete) return;
    if (!confirm('Delete this review? This cannot be undone.')) return;
    try {
      await onDelete();
    } catch (err) {
      toast.error('Failed to delete review');
      console.error(err);
    }
  };

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 shadow-2xl relative overflow-hidden group"
    >
      <div className="absolute -right-20 -top-20 w-48 h-48 rounded-full bg-blue-600 blur-[80px] opacity-10 group-hover:opacity-20 transition-opacity duration-500" />

      {title && (
        <div className="relative z-10">
          <h1 className="text-2xl font-black text-white tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="text-blue-200/50 mt-1">{description}</p>
          )}
        </div>
      )}

      <div className="relative z-10">
        <label className="mb-3 block text-[10px] font-bold uppercase tracking-widest text-blue-200/60">
          Rate your experience
        </label>
        <div className="bg-white/5 rounded-xl p-3 border border-white/5 inline-block">
          <StarRatingInput
            value={ratingValue}
            onChange={(val) =>
              setValue('rating', val, { shouldValidate: true })
            }
            size="lg"
          />
        </div>
        {errors.rating && (
          <p className="mt-2 text-xs font-bold text-red-400/80 uppercase tracking-tight">
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
          id="comment"
          rows={4}
          className={`
            w-full resize-none rounded-xl border px-4 py-4 transition-all duration-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 text-sm font-medium
            ${
              errors.comment
                ? 'border-red-500/30 bg-red-500/5 text-red-200'
                : 'border-white/10 bg-white/5 text-white focus:border-blue-500/40 hover:border-white/20'
            }
          `}
          placeholder="Share details of your own experience at this place..."
          {...register('comment')}
        />
        <div className="mt-3 flex items-center justify-between">
          {errors.comment ? (
            <p className="text-xs font-bold text-red-400/80 uppercase tracking-tight">
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

      <div className="flex flex-col-reverse gap-4 pt-4 sm:flex-row sm:justify-end relative z-10">
        {onDelete && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting || isSubmitting}
            className="flex items-center justify-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-red-400 transition-all hover:bg-red-500/20 disabled:opacity-50"
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            Delete
          </button>
        )}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting || isDeleting}
            className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-blue-200/60 transition-all hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            {cancelLabel}
          </button>
        )}
        <button
          type="submit"
          disabled={isSubmitting || isDeleting || ratingValue === 0}
          className="flex min-w-[160px] items-center gap-2 justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-white transition-all hover:from-emerald-500 hover:to-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] disabled:cursor-not-allowed disabled:opacity-50 shadow-lg"
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Wallet className="w-4 h-4" />
              {submitLabel}
            </>
          )}
        </button>
      </div>
    </form>
  );
}