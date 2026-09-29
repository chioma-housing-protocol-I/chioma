'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { fieldA11yProps, fieldErrorId } from '@/lib/forms/a11y';
import { FormErrorSummary } from '@/components/forms/FormErrorSummary';
import { LoadingButton } from '@/components/loading/LoadingButton';
import { useUserAgreements } from '@/lib/query/hooks/use-agreements';
import type { CreateSubletRequestPayload } from '@/lib/query/hooks/use-sublets';

const schema = z
  .object({
    agreementId: z.string().min(1, 'Please select an agreement'),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    reason: z
      .string()
      .max(500, 'Reason cannot exceed 500 characters')
      .optional(),
  })
  .refine((v) => new Date(v.endDate) > new Date(v.startDate), {
    message: 'End date must be after start date',
    path: ['endDate'],
  });

type FormValues = z.infer<typeof schema>;

const inputClass =
  'w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-blue-300/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50';
const labelClass = 'block text-sm font-medium text-blue-200/70 mb-2';

export interface SubletRequestFormProps {
  onSubmit: (payload: CreateSubletRequestPayload) => Promise<void>;
  isSubmitting?: boolean;
}

/**
 * Sublet request creation form (#1553). Validates with react-hook-form + zod,
 * matching the rest of the app's form conventions (see e.g.
 * RefundRequestModal, PropertyListingForm), rather than the native
 * `required`-only validation the previous inline page markup used.
 */
export function SubletRequestForm({
  onSubmit,
  isSubmitting = false,
}: SubletRequestFormProps) {
  const { data: agreementsData, isLoading: isLoadingAgreements } =
    useUserAgreements();
  const agreements = agreementsData?.data ?? [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, submitCount },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      agreementId: '',
      startDate: '',
      endDate: '',
      reason: '',
    },
  });

  const onFormSubmit = async (values: FormValues) => {
    await onSubmit({
      agreementId: values.agreementId,
      startDate: values.startDate,
      endDate: values.endDate,
      reason: values.reason || undefined,
    });
    reset();
  };

  return (
    <form
      onSubmit={handleSubmit(onFormSubmit)}
      noValidate
      className="space-y-6"
    >
      <FormErrorSummary errors={errors} submitCount={submitCount} />

      <div>
        <label htmlFor="agreementId" className={labelClass}>
          Agreement
        </label>
        <select
          className={inputClass}
          disabled={isLoadingAgreements}
          {...register('agreementId')}
          {...fieldA11yProps('agreementId', errors.agreementId)}
        >
          <option value="" className="bg-slate-900">
            {isLoadingAgreements
              ? 'Loading agreements…'
              : 'Select an agreement'}
          </option>
          {agreements.map((agreement) => (
            <option
              key={agreement.id}
              value={agreement.id}
              className="bg-slate-900"
            >
              {agreement.displayTitle ??
                `Agreement ${agreement.id.slice(0, 8)}`}
            </option>
          ))}
        </select>
        {errors.agreementId && (
          <p
            id={fieldErrorId('agreementId')}
            className="text-xs text-red-400 mt-2"
          >
            {errors.agreementId.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="startDate" className={labelClass}>
            Start date
          </label>
          <input
            type="date"
            className={inputClass}
            {...register('startDate')}
            {...fieldA11yProps('startDate', errors.startDate)}
          />
          {errors.startDate && (
            <p
              id={fieldErrorId('startDate')}
              className="text-xs text-red-400 mt-2"
            >
              {errors.startDate.message}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="endDate" className={labelClass}>
            End date
          </label>
          <input
            type="date"
            className={inputClass}
            {...register('endDate')}
            {...fieldA11yProps('endDate', errors.endDate)}
          />
          {errors.endDate && (
            <p
              id={fieldErrorId('endDate')}
              className="text-xs text-red-400 mt-2"
            >
              {errors.endDate.message}
            </p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="reason" className={labelClass}>
          Reason (optional)
        </label>
        <textarea
          rows={4}
          className={inputClass}
          placeholder="Why are you requesting to sublet?"
          {...register('reason')}
          {...fieldA11yProps('reason', errors.reason)}
        />
        {errors.reason && (
          <p id={fieldErrorId('reason')} className="text-xs text-red-400 mt-2">
            {errors.reason.message}
          </p>
        )}
      </div>

      <LoadingButton type="submit" loading={isSubmitting}>
        Submit request
      </LoadingButton>
    </form>
  );
}

export default SubletRequestForm;
