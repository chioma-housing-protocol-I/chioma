import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import {
  apiSuccessResponseSchema,
  paginatedResponseSchema,
  apiErrorResponseSchema,
  validateApiResponse,
  safeValidateApiResponse,
} from '@/lib/validation/api-response';

const disputeSchema = z.object({ id: z.string(), status: z.string() });

describe('api-response validation', () => {
  it('accepts a valid success response', () => {
    const schema = apiSuccessResponseSchema(disputeSchema);
    const result = schema.safeParse({
      data: { id: 'dis-001', status: 'OPEN' },
    });
    expect(result.success).toBe(true);
  });

  it('rejects a success response missing data', () => {
    const schema = apiSuccessResponseSchema(disputeSchema);
    const result = schema.safeParse({ message: 'ok' });
    expect(result.success).toBe(false);
  });

  it('accepts a valid paginated response', () => {
    const schema = paginatedResponseSchema(disputeSchema);
    const result = schema.safeParse({
      data: [{ id: 'dis-001', status: 'OPEN' }],
      total: 1,
      page: 1,
    });
    expect(result.success).toBe(true);
  });

  it('rejects a paginated response with wrong item shape', () => {
    const schema = paginatedResponseSchema(disputeSchema);
    const result = schema.safeParse({ data: [{ id: 123 }] });
    expect(result.success).toBe(false);
  });

  it('validates an error response', () => {
    const result = apiErrorResponseSchema.safeParse({
      message: 'Not found',
      statusCode: 404,
    });
    expect(result.success).toBe(true);
  });

  it('validateApiResponse throws on invalid data', () => {
    const schema = apiSuccessResponseSchema(disputeSchema);
    expect(() => validateApiResponse(schema, { data: { id: 1 } })).toThrow();
  });

  it('safeValidateApiResponse returns errors without throwing', () => {
    const schema = apiSuccessResponseSchema(disputeSchema);
    const result = safeValidateApiResponse(schema, { data: { id: 1 } });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });
});
