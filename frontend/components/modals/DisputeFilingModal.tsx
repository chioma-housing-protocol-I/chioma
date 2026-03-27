'use client';

import React from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertTriangle, Scale } from 'lucide-react';
import toast from 'react-hot-toast';
import { BaseModal } from './BaseModal';
import { Uploader } from '@/components/ui/Uploader';
import type { DisputeType } from '@/lib/dashboard-data';

const disputeTypes: { value: DisputeType; label: string }[] = [
  { value: 'RENT_PAYMENT', label: 'Rent Payment' },
  { value: 'SECURITY_DEPOSIT', label: 'Security Deposit' },
  { value: 'PROPERTY_DAMAGE', label: 'Property Damage' },
  { value: 'MAINTENANCE', label: 'Maintenance Issue' },
  { value: 'TERMINATION', label: 'Lease Termination' },
  { value: 'OTHER', label: 'Other' },
];

const schema = z.object({
  agreementId: z.string().min(1, 'Agreement ID is required'),
  disputeType: z.enum([
    'RENT_PAYMENT',
    'SECURITY_DEPOSIT',
    'PROPERTY_DAMAGE',
    'MAINTENANCE',
    'TERMINATION',
    'OTHER',
  ]),
  description: z
    .string()
    .min(20, 'Description must be at least 20 characters')
    .max(2000, 'Description cannot exceed 2000 characters'),
  requestedAmount: z
    .string()
    .optional()
    .refine(
      (val) => !val || (!isNaN(Number(val)) && Number(val) > 0),
      'Must be a positive number',
    ),
});

type FormValues = z.infer<typeof schema>;

export interface DisputeFilingData {
  agreementId: string;
  disputeType: DisputeType;
  description: string;
  requestedAmount?: number;
  evidence: File[];
}

interface DisputeFilingModalProps {
  isOpen: boolean;
  onClose: () => void;
  agreementId?: string;
  onSubmit?: (data: DisputeFilingData) => Promise<void>;
}

export const DisputeFilingModal: React.FC<DisputeFilingModalProps> = ({
  isOpen,
  onClose,
  agreementId = '',
  onSubmit,
}) => {
  const [evidence, setEvidence] = React.useState<File[]>([]);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      agreementId,
      disputeType: 'MAINTENANCE',
      description: '',
      requestedAmount: '',
    },
  });

  const description = useWatch({
    control,
    name: 'description',
    defaultValue: '',
  });

  const handleClose = () => {
    reset();
    setEvidence([]);
    onClose();
  };

  const onFormSubmit = async (values: FormValues) => {
    if (!onSubmit) return;
    try {
      await onSubmit({
        agreementId: values.agreementId,
        disputeType: values.disputeType,
        description: values.description,
        requestedAmount: values.requestedAmount
          ? Number(values.requestedAmount)
          : undefined,
        evidence,
      });
      toast.success('Dispute filed successfully');
      handleClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to file dispute',
      );
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title="File a Dispute"
      subtitle="Provide details about the issue you're experiencing"
      size="lg"
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
            form="dispute-filing-form"
            disabled={isSubmitting}
            className="px-6 py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-md transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Filing...
              </>
            ) : (
              <>
                <Scale size={18} />
                File Dispute
              </>
            )}
          </button>
        </div>
      }
    >
      <form
        id="dispute-filing-form"
        onSubmit={handleSubmit(onFormSubmit)}
        noValidate
        className="space-y-6"
      >
        {/* Warning Banner */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
          <p className="text-sm text-amber-900 dark:text-amber-100">
            Filing a dispute notifies all parties. Please attempt direct
            resolution first.
          </p>
        </div>

        {/* Agreement ID */}
        <div>
          <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
            Agreement ID *
          </label>
          <input
            {...register('agreementId')}
            placeholder="AGR-2025-014"
            className="w-full px-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
          />
          {errors.agreementId && (
            <p className="text-xs text-red-500 mt-1">
              {errors.agreementId.message}
            </p>
          )}
        </div>

        {/* Type + Amount */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
              Dispute Type *
            </label>
            <select
              {...register('disputeType')}
              className="w-full px-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
            >
              {disputeTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
              Requested Amount (optional)
            </label>
            <input
              {...register('requestedAmount')}
              inputMode="numeric"
              placeholder="e.g. 40000"
              className="w-full px-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
            {errors.requestedAmount && (
              <p className="text-xs text-red-500 mt-1">
                {errors.requestedAmount.message}
              </p>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
            Description *
          </label>
          <textarea
            {...register('description')}
            rows={6}
            placeholder="Describe the issue, timeline, and the outcome you are requesting..."
            className="w-full px-4 py-3 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none"
          />
          <div className="flex items-center justify-between mt-1">
            {errors.description ? (
              <p className="text-xs text-red-500">
                {errors.description.message}
              </p>
            ) : (
              <span />
            )}
            <p className="text-xs text-neutral-500 ml-auto">
              {description?.length ?? 0}/2000
            </p>
          </div>
        </div>

        {/* Evidence Upload */}
        <div>
          <label className="block text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
            Supporting Evidence (optional)
          </label>
          <Uploader
            label=""
            accept="image/*,application/pdf,.doc,.docx"
            multiple
            onFilesSelected={setEvidence}
            maxFiles={5}
            description="Upload photos, documents, or receipts (max 5 files)"
          />
          <p className="text-xs text-neutral-500 mt-2">
            Supported: Images, PDF, Word. Max 10MB per file.
          </p>
        </div>
      </form>
    </BaseModal>
  );
};
