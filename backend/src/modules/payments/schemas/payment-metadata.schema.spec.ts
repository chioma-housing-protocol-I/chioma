import { BadRequestException } from '@nestjs/common';
import {
  paymentMetadataSchema,
  paymentMethodMetadataSchema,
  parsePaymentMetadata,
  parsePaymentMethodMetadata,
} from './payment-metadata.schema';

describe('paymentMetadataSchema', () => {
  it('accepts known fields with the correct types', () => {
    const result = paymentMetadataSchema.parse({
      chargeId: 'ch_123',
      gateway: 'stellar',
      escrowId: 42,
    });

    expect(result).toEqual({
      chargeId: 'ch_123',
      gateway: 'stellar',
      escrowId: 42,
    });
  });

  it('passes through unknown fields (extensible metadata)', () => {
    const result = paymentMetadataSchema.parse({
      chargeId: 'ch_123',
      sourcePublicKey: 'G...',
    });

    expect(result.sourcePublicKey).toBe('G...');
  });

  it('rejects a chargeId that is not a string', () => {
    const result = paymentMetadataSchema.safeParse({ chargeId: 12345 });
    expect(result.success).toBe(false);
  });

  it('rejects an escrowId that is not a number', () => {
    const result = paymentMetadataSchema.safeParse({ escrowId: '42' });
    expect(result.success).toBe(false);
  });
});

describe('parsePaymentMetadata', () => {
  it('returns null for null/undefined input', () => {
    expect(parsePaymentMetadata(null)).toBeNull();
    expect(parsePaymentMetadata(undefined)).toBeNull();
  });

  it('returns validated metadata for valid input', () => {
    expect(parsePaymentMetadata({ chargeId: 'ch_1' })).toEqual({
      chargeId: 'ch_1',
    });
  });

  it('throws BadRequestException for invalid metadata', () => {
    expect(() => parsePaymentMetadata({ chargeId: 999 })).toThrow(
      BadRequestException,
    );
  });

  it('throws BadRequestException for a non-object payload', () => {
    expect(() => parsePaymentMetadata('not-an-object')).toThrow(
      BadRequestException,
    );
  });
});

describe('paymentMethodMetadataSchema', () => {
  it('accepts an arbitrary string-keyed record', () => {
    const result = paymentMethodMetadataSchema.parse({
      nickname: 'Personal card',
      tags: ['primary'],
    });
    expect(result.nickname).toBe('Personal card');
  });
});

describe('parsePaymentMethodMetadata', () => {
  it('returns null for null/undefined input', () => {
    expect(parsePaymentMethodMetadata(null)).toBeNull();
    expect(parsePaymentMethodMetadata(undefined)).toBeNull();
  });

  it('throws BadRequestException for a non-object payload', () => {
    expect(() => parsePaymentMethodMetadata('nope')).toThrow(
      BadRequestException,
    );
  });
});
