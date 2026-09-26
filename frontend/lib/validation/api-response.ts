import { z } from 'zod';

export const apiSuccessResponseSchema = <T extends z.ZodTypeAny>(
  dataSchema: T,
) =>
  z.object({
    data: dataSchema,
    message: z.string().optional(),
    status: z.number().optional(),
  });

export const paginatedResponseSchema = <T extends z.ZodTypeAny>(
  itemSchema: T,
) =>
  z.object({
    data: z.array(itemSchema),
    total: z.number().optional(),
    page: z.number().optional(),
    limit: z.number().optional(),
  });

export const apiErrorResponseSchema = z.object({
  message: z.string(),
  statusCode: z.number().optional(),
  error: z.string().optional(),
});

export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;

export function validateApiResponse<T>(schema: z.ZodType<T>, data: unknown): T {
  return schema.parse(data);
}

export function safeValidateApiResponse<T>(
  schema: z.ZodType<T>,
  data: unknown,
): { success: true; data: T } | { success: false; errors: z.ZodIssue[] } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error.issues };
}
