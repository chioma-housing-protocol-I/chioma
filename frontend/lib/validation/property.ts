import { z } from 'zod';

// Basic property details schema
export const propertyBasicDetailsSchema = z.object({
  title: z
    .string()
    .min(1, 'Property title is required')
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title must be less than 100 characters'),
  rent: z
    .number()
    .min(1, 'Rent must be at least 1 USDC')
    .max(100000, 'Rent cannot exceed 100,000 USDC'),
  address: z
    .string()
    .min(1, 'Full address is required')
    .min(10, 'Address must be at least 10 characters')
    .max(500, 'Address must be less than 500 characters'),
});

// Amenities schema
export const propertyAmenitiesSchema = z.object({
  amenities: z
    .array(z.string())
    .min(0)
    .max(20, 'Cannot select more than 20 amenities'),
});

// Media uploads schema (simplified for now)
export const propertyMediaSchema = z.object({
  images: z
    .array(z.instanceof(File))
    .min(0)
    .max(10, 'Cannot upload more than 10 images')
    .refine(
      (files) => files.every((file) => file.size <= 5 * 1024 * 1024), // 5MB max
      'Each image must be less than 5MB',
    )
    .refine(
      (files) =>
        files.every((file) =>
          [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/gif',
            'image/svg+xml',
          ].includes(file.type),
        ),
      'Only JPEG, PNG, GIF, and SVG images are allowed',
    ),
});

// Combined schema for the entire property creation form
export const propertyCreationSchema = z.object({
  ...propertyBasicDetailsSchema.shape,
  ...propertyAmenitiesSchema.shape,
  ...propertyMediaSchema.shape,
});

export type PropertyBasicDetails = z.infer<typeof propertyBasicDetailsSchema>;
export type PropertyAmenities = z.infer<typeof propertyAmenitiesSchema>;
export type PropertyMedia = z.infer<typeof propertyMediaSchema>;
export type PropertyCreationData = z.infer<typeof propertyCreationSchema>;
