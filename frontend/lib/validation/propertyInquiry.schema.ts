import { z } from 'zod';

// Property inquiry schema
export const propertyInquirySchema = z.object({
  propertyId: z.string(),
  propertyTitle: z.string(),
  name: z.string().trim().min(1, 'Name is required'),
  // Mirrors the prior ad hoc `validate()`: an empty value reports only
  // "Email is required" (format is checked only once a value is present),
  // so this uses superRefine instead of a min+regex chain, which would
  // report both issues at once for an empty string.
  email: z
    .string()
    .trim()
    .superRefine((val, ctx) => {
      if (val.length === 0) {
        ctx.addIssue({ code: 'custom', message: 'Email is required' });
        return;
      }
      if (!/^\S+@\S+\.\S+$/.test(val)) {
        ctx.addIssue({
          code: 'custom',
          message: 'Enter a valid email address',
        });
      }
    }),
  phone: z.string(),
  message: z.string().trim().min(1, 'Message is required'),
});

export type PropertyInquiryFormValues = z.infer<typeof propertyInquirySchema>;
