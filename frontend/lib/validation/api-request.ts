import { z } from 'zod';

export class ValidationError extends Error {
  readonly issues: z.ZodIssue[];

  constructor(error: z.ZodError) {
    super('Request validation failed');
    this.name = 'ValidationError';
    this.issues = error.issues;
  }

  toResponse() {
    return {
      message: this.message,
      errors: this.issues.map((issue) => ({
        field: issue.path.length > 0 ? issue.path.join('.') : 'root',
        message: issue.message,
      })),
    };
  }
}

/**
 * Validates `data` against `schema` and returns the parsed value.
 * Throws `ValidationError` when validation fails.
 */
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ValidationError(result.error);
  }
  return result.data;
}

export const idSchema = z.string().min(1, 'ID is required');

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1, 'Page must be at least 1').default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(20),
});

export const searchSchema = z.object({
  q: z
    .string()
    .min(1, 'Search query cannot be empty')
    .max(200, 'Search query is too long')
    .optional(),
});

export type PaginationParams = z.infer<typeof paginationSchema>;
export type SearchParams = z.infer<typeof searchSchema>;
