'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { DollarSign, AlertCircle, ReceiptText } from 'lucide-react';
import toast from 'react-hot-toast';
import { BaseModal } from './BaseModal';

const REFUND_REASONS = [
  'Duplicate payment',
  'Service not provided',
  'Overcharged amount',
  'Payment made in error',
  'Lease terminated early',
  'Other',
] as const;

const schema = z.object({
  reason: z.enum(REFUND_REASONS, { error: 'Please select a reason' }),
  details: z
    .string()
    .min(10, 'Please provide at least 10 characters of detail')
    .max(500, 'Details cannot exceed 500 characters'),
  requestedAmount: z
    .string()
    .min(1, 'Amount is required')
    .refine(
      (val) => !isNaN(Number(val)) && Number(val) > 0,
      'Must be a positive number',
    ),
});

type FormValues = z.infer<typeof schema>;

export interface RefundRequestData {
  paymentId: string;
  reason: string;
  details: string;
  requestedAmount: number;
}

interface RefundRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  paymentId?: string;
  paymentAmount?: number;
  propertyName?: string;
  onSubmit?: (data: RefundRequestData) => Promise<void>;
}

export const RefundRequestModal: React.FC<RefundRequestModalProps> = ({
  isOpen,
  onClose,
  paymentId = '',
  paymentAmount = 0,
  propertyName,
  onSubmit,
}) => {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      reason: undefined,
      details: '',
      requestedAmount: paymentAmount > 0 ? String(paymentAmount) : '',
    },
  });

  const details = watch('details');

  const handleClose = () => {
    reset();
    onClose();
  };

  const onFormSubmit = async (values: FormValues) => {
    if (!onSubmit) return;
    try {
      await onSubmit({
        paymentId,
        reason: values.reason,
        details: values.details,
        requestedAmount: Number(values.requestedAmount),
      });
      toast.success('Refund request submitted successfully');
      handleClose();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to submit refund request',
      );
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Request a Refund"
      subtitle={
        propertyName
          ? `Payment for ${propertyName}`
          : 'Submit a refund request for review'
      }
      size="md"
      footer={
        <div className="flex items-center justify-end gap-3 w-full">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="refund-request-form"
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-md transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <ReceiptText size={18} />
                Submit Request
              </>
            )}
          </button>
        </div>
      }
    >
      <form
        id="refund-request-form"
        onSubmit={handleSubmit(onFormSubmit)}
        noValidate
        className="space-y-6"
      >
        {/* Info Banner */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/30 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="text-blue-600 shrink-0 mt-0.5" size={20} />
          <p className="text-sm text-blue-900 dark:text-blue-100">
            Refund requests are reviewed within 3–5 business days. You will be
            notified by email once a decision is made.
          </p>
        </div>

        {/* Requested Amount */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-600/10 rounded-xl flex items-center justify-center">
              <DollarSign className="text-amber-600" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                Refund Amount
              </h3>
              {paymentAmount > 0 && (
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Original payment: ${paymentAmount.toLocaleString()}
                </p>
              )}
            </div>
          </div>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-neutral-500">
              $
            </span>
            <input
              {...register('requestedAmount')}
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              min="0"
              step="0.01"
              className="w-full pl-12 pr-4 py-4 bg-white dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-700 rounded-xl text-3xl font-bold text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          {errors.requestedAmount && (
            <p className="text-xs text-red-500 mt-2">
              {errors.requestedAmount.message}
            </p>
          )}
        </div>

        {/* Reason */}
        <div>
          <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
            Reason for Refund *
          </label>
          <select
            {...register('reason')}
            className="w-full px-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">Select a reason...</option>
            {REFUND_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          {errors.reason && (
            <p className="text-xs text-red-500 mt-1">{errors.reason.message}</p>
          )}
        </div>

        {/* Details */}
        <div>
          <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
            Additional Details *
          </label>
          <textarea
            {...register('details')}
            rows={4}
            placeholder="Describe why you are requesting this refund..."
            className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
          />
          <div className="flex items-center justify-between mt-1">
            {errors.details ? (
              <p className="text-xs text-red-500">{errors.details.message}</p>
            ) : (
              <span />
            )}
            <p className="text-xs text-neutral-500 ml-auto">
              {details?.length ?? 0}/500
            </p>
          </div>
        </div>
      </form>
    </BaseModal>
  );
};
