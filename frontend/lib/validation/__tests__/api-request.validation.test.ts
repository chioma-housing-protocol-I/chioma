import { describe, it, expect } from 'vitest';
import {
  ValidationError,
  validateRequest,
  idSchema,
  paginationSchema,
  searchSchema,
} from '../api-request';
import { z } from 'zod';

// ─── ValidationError ──────────────────────────────────────────────────────────

describe('ValidationError', () => {
  function makeError(schema: z.ZodSchema, data: unknown): ValidationError {
    const result = schema.safeParse(data);
    if (result.success) throw new Error('Expected schema to fail');
    return new ValidationError(result.error);
  }

  it('has the name ValidationError', () => {
    const err = makeError(z.string(), 42);
    expect(err.name).toBe('ValidationError');
  });

  it('has a fixed message', () => {
    const err = makeError(z.string(), 42);
    expect(err.message).toBe('Request validation failed');
  });

  it('exposes the ZodIssue array', () => {
    const err = makeError(z.string(), 42);
    expect(Array.isArray(err.issues)).toBe(true);
    expect(err.issues.length).toBeGreaterThan(0);
  });

  it('toResponse returns message and error list', () => {
    const err = makeError(z.object({ name: z.string() }), { name: 123 });
    const response = err.toResponse();
    expect(response.message).toBe('Request validation failed');
    expect(Array.isArray(response.errors)).toBe(true);
    expect(response.errors[0]).toHaveProperty('field');
    expect(response.errors[0]).toHaveProperty('message');
  });

  it('toResponse uses "root" when the path is empty', () => {
    const err = makeError(z.string(), 42);
    const response = err.toResponse();
    expect(response.errors[0].field).toBe('root');
  });

  it('toResponse joins nested paths with a dot', () => {
    const err = makeError(
      z.object({ address: z.object({ city: z.string() }) }),
      { address: { city: 99 } },
    );
    const response = err.toResponse();
    expect(response.errors[0].field).toBe('address.city');
  });
});

// ─── validateRequest ──────────────────────────────────────────────────────────

describe('validateRequest', () => {
  it('returns parsed data when valid', () => {
    const schema = z.object({ id: z.string() });
    const result = validateRequest(schema, { id: 'abc' });
    expect(result).toEqual({ id: 'abc' });
  });

  it('throws ValidationError when invalid', () => {
    const schema = z.object({ id: z.string() });
    expect(() => validateRequest(schema, { id: 42 })).toThrow(ValidationError);
  });

  it('applies schema defaults', () => {
    const schema = z.object({ page: z.number().default(1) });
    const result = validateRequest(schema, {});
    expect(result.page).toBe(1);
  });
});

// ─── idSchema ─────────────────────────────────────────────────────────────────

describe('idSchema', () => {
  it('accepts a non-empty string', () => {
    expect(idSchema.safeParse('abc-123').success).toBe(true);
  });

  it('rejects an empty string', () => {
    expect(idSchema.safeParse('').success).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(idSchema.safeParse(123).success).toBe(false);
    expect(idSchema.safeParse(null).success).toBe(false);
  });
});

// ─── paginationSchema ─────────────────────────────────────────────────────────

describe('paginationSchema', () => {
  it('accepts valid page and limit', () => {
    const result = paginationSchema.safeParse({ page: 2, limit: 50 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(50);
    }
  });

  it('applies default values when fields are absent', () => {
    const result = paginationSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it('coerces string numbers', () => {
    const result = paginationSchema.safeParse({ page: '3', limit: '10' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
    }
  });

  it('rejects page < 1', () => {
    expect(paginationSchema.safeParse({ page: 0 }).success).toBe(false);
  });

  it('rejects limit > 100', () => {
    expect(paginationSchema.safeParse({ limit: 101 }).success).toBe(false);
  });

  it('rejects limit < 1', () => {
    expect(paginationSchema.safeParse({ limit: 0 }).success).toBe(false);
  });
});

// ─── searchSchema ─────────────────────────────────────────────────────────────

describe('searchSchema', () => {
  it('accepts a valid query', () => {
    const result = searchSchema.safeParse({ q: 'Lagos apartment' });
    expect(result.success).toBe(true);
  });

  it('accepts an absent query field', () => {
    const result = searchSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.q).toBeUndefined();
    }
  });

  it('rejects an empty string query', () => {
    expect(searchSchema.safeParse({ q: '' }).success).toBe(false);
  });

  it('rejects a query longer than 200 characters', () => {
    expect(searchSchema.safeParse({ q: 'a'.repeat(201) }).success).toBe(false);
  });
});
