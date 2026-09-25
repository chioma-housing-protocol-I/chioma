import { z } from 'zod';

// Contact form schema
export const contactFormSchema = z.object({
  name: z.string().min(2, 'Enter your name'),
  email: z.email('Enter a valid email address'),
  phone: z
    .string()
    .min(7, 'Enter a valid phone number')
    .optional()
    .or(z.literal('')),
  subject: z.string().min(4, 'Enter a subject'),
  message: z.string().min(12, 'Message should be at least 12 characters'),
});

export type ContactFormData = z.infer<typeof contactFormSchema>;
