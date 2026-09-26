import { z } from 'zod';

// Dispute filing schema
export const disputeFilingSchema = z.object({
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

export type DisputeFilingFormValues = z.infer<typeof disputeFilingSchema>;
