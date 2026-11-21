import { BadRequestException } from '@nestjs/common';
import { PaymentInterval } from './entities/payment-schedule.entity';
import { PaymentStatus } from './entities/payment.entity';
import {
  ensureUserId,
  getIdempotencyKey,
  addDays,
  calculateNextRunAt,
  parseEscrowReference,
  PAYMENT_STATUS_MAP,
  encryptMetadata,
  decryptMetadata,
} from './payment.helpers';

describe('PaymentHelpers', () => {
  const originalEnv = process.env.PAYMENT_METADATA_SECRET;

  beforeEach(() => {
    process.env.PAYMENT_METADATA_SECRET = 'test-payment-metadata-secret-key-32b';
  });

  afterAll(() => {
    process.env.PAYMENT_METADATA_SECRET = originalEnv;
  });

  describe('ensureUserId', () => {
    it('throws BadRequestException if userId is empty string', () => {
      expect(() => ensureUserId('')).toThrow(BadRequestException);
      expect(() => ensureUserId('')).toThrow('User ID is required');
    });

    it('throws BadRequestException if userId is null or undefined', () => {
      expect(() => ensureUserId(null as unknown as string)).toThrow(
        BadRequestException,
      );
      expect(() => ensureUserId(undefined as unknown as string)).toThrow(
        BadRequestException,
      );
    });

    it('does not throw when userId is a valid non-empty string', () => {
      expect(() => ensureUserId('user_valid_123')).not.toThrow();
    });
  });

  describe('getIdempotencyKey', () => {
    it('returns the key when idempotencyKey is a non-empty string', () => {
      expect(getIdempotencyKey({ idempotencyKey: 'idem_key_123' })).toBe(
        'idem_key_123',
      );
    });

    it('returns empty string if idempotencyKey is empty string', () => {
      expect(getIdempotencyKey({ idempotencyKey: '' })).toBe('');
    });

    it('returns null when idempotencyKey is not a string', () => {
      expect(getIdempotencyKey({ idempotencyKey: 12345 })).toBeNull();
      expect(getIdempotencyKey({ idempotencyKey: true })).toBeNull();
      expect(getIdempotencyKey({ idempotencyKey: null })).toBeNull();
      expect(getIdempotencyKey({ idempotencyKey: undefined })).toBeNull();
      expect(getIdempotencyKey({ idempotencyKey: {} })).toBeNull();
      expect(getIdempotencyKey({})).toBeNull();
    });
  });

  describe('addDays', () => {
    it('adds positive days correctly without mutating original Date', () => {
      const original = new Date('2026-01-10T12:00:00Z');
      const originalTimestamp = original.getTime();
      const result = addDays(original, 5);

      expect(result.getDate()).toBe(15);
      expect(result.getMonth()).toBe(0); // January
      expect(original.getTime()).toBe(originalTimestamp);
    });

    it('adds 0 days and preserves exact timestamp', () => {
      const original = new Date('2026-03-15T08:30:00Z');
      const result = addDays(original, 0);

      expect(result.getTime()).toBe(original.getTime());
    });

    it('handles month rollover correctly', () => {
      const original = new Date('2026-01-30T12:00:00Z');
      const result = addDays(original, 5);

      expect(result.getMonth()).toBe(1); // February
      expect(result.getDate()).toBe(4);
    });
  });

  describe('calculateNextRunAt', () => {
    it('calculates next run for WEEKLY interval (+7 days)', () => {
      const base = new Date('2026-02-01T10:00:00Z');
      const next = calculateNextRunAt(base, PaymentInterval.WEEKLY);

      expect(next.getDate()).toBe(8);
      expect(next.getMonth()).toBe(1);
    });

    it('calculates next run for MONTHLY interval (+1 month)', () => {
      const base = new Date('2026-03-15T10:00:00Z');
      const next = calculateNextRunAt(base, PaymentInterval.MONTHLY);

      expect(next.getMonth()).toBe(3); // April
      expect(next.getDate()).toBe(15);
    });

    it('calculates next run for QUARTERLY interval (+3 months)', () => {
      const base = new Date('2026-01-10T10:00:00Z');
      const next = calculateNextRunAt(base, PaymentInterval.QUARTERLY);

      expect(next.getMonth()).toBe(3); // April
      expect(next.getDate()).toBe(10);
    });

    it('calculates next run for YEARLY interval (+1 year)', () => {
      const base = new Date('2026-05-20T10:00:00Z');
      const next = calculateNextRunAt(base, PaymentInterval.YEARLY);

      expect(next.getFullYear()).toBe(2027);
      expect(next.getMonth()).toBe(4); // May
      expect(next.getDate()).toBe(20);
    });

    it('falls back to 30 days for unrecognized interval', () => {
      const base = new Date('2026-01-01T10:00:00Z');
      const next = calculateNextRunAt(
        base,
        'UNKNOWN_INTERVAL' as PaymentInterval,
      );

      expect(next.getDate()).toBe(31);
      expect(next.getMonth()).toBe(0);
    });
  });

  describe('parseEscrowReference', () => {
    it('parses valid escrow reference into numeric ID', () => {
      expect(parseEscrowReference('escrow:42')).toBe(42);
      expect(parseEscrowReference('escrow:1001')).toBe(1001);
    });

    it('returns null when reference does not start with escrow:', () => {
      expect(parseEscrowReference('payment:42')).toBeNull();
      expect(parseEscrowReference('charge_12345')).toBeNull();
      expect(parseEscrowReference('escrow_42')).toBeNull();
    });

    it('returns null when escrow ID is not a valid integer', () => {
      expect(parseEscrowReference('escrow:abc')).toBeNull();
      expect(parseEscrowReference('escrow:')).toBeNull();
    });

    it('returns null when referenceNumber is null or undefined or empty', () => {
      expect(parseEscrowReference(null as unknown as string)).toBeNull();
      expect(parseEscrowReference(undefined as unknown as string)).toBeNull();
      expect(parseEscrowReference('')).toBeNull();
    });
  });

  describe('PAYMENT_STATUS_MAP', () => {
    it('maps gateway completion statuses to PaymentStatus.COMPLETED', () => {
      expect(PAYMENT_STATUS_MAP['completed']).toBe(PaymentStatus.COMPLETED);
      expect(PAYMENT_STATUS_MAP['successful']).toBe(PaymentStatus.COMPLETED);
      expect(PAYMENT_STATUS_MAP['success']).toBe(PaymentStatus.COMPLETED);
      expect(PAYMENT_STATUS_MAP['released']).toBe(PaymentStatus.COMPLETED);
    });

    it('maps pending statuses to PaymentStatus.PENDING', () => {
      expect(PAYMENT_STATUS_MAP['pending']).toBe(PaymentStatus.PENDING);
      expect(PAYMENT_STATUS_MAP['processing']).toBe(PaymentStatus.PENDING);
      expect(PAYMENT_STATUS_MAP['active']).toBe(PaymentStatus.PENDING);
    });

    it('maps failure and cancellation statuses to PaymentStatus.FAILED', () => {
      expect(PAYMENT_STATUS_MAP['error']).toBe(PaymentStatus.FAILED);
      expect(PAYMENT_STATUS_MAP['cancelled']).toBe(PaymentStatus.FAILED);
      expect(PAYMENT_STATUS_MAP['failed']).toBe(PaymentStatus.FAILED);
      expect(PAYMENT_STATUS_MAP['expired']).toBe(PaymentStatus.FAILED);
    });

    it('maps refunded status to PaymentStatus.REFUNDED', () => {
      expect(PAYMENT_STATUS_MAP['refunded']).toBe(PaymentStatus.REFUNDED);
    });
  });

  describe('encryptMetadata and decryptMetadata', () => {
    it('encrypts and decrypts metadata preserving data structure', () => {
      const data = {
        cardNumberMasked: '**** **** **** 4242',
        cardBrand: 'visa',
        expiryMonth: 12,
        expiryYear: 2028,
        nested: { secure: true },
      };

      const encrypted = encryptMetadata(data);
      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
      expect(encrypted.split(':')).toHaveLength(3);

      const decrypted = decryptMetadata(encrypted);
      expect(decrypted).toEqual(data);
    });

    it('throws BadRequestException when PAYMENT_METADATA_SECRET is not set during encryption', () => {
      delete process.env.PAYMENT_METADATA_SECRET;

      expect(() => encryptMetadata({ key: 'val' })).toThrow(
        BadRequestException,
      );
      expect(() => encryptMetadata({ key: 'val' })).toThrow(
        'PAYMENT_METADATA_SECRET is required to store sensitive metadata',
      );
    });

    it('returns null from decryptMetadata when payload is null or empty', () => {
      expect(decryptMetadata(null)).toBeNull();
      expect(decryptMetadata('')).toBeNull();
    });

    it('returns null from decryptMetadata when PAYMENT_METADATA_SECRET is unset', () => {
      const encrypted = encryptMetadata({ key: 'val' });
      delete process.env.PAYMENT_METADATA_SECRET;

      expect(decryptMetadata(encrypted)).toBeNull();
    });

    it('returns null from decryptMetadata when payload format is invalid', () => {
      expect(decryptMetadata('invalid-payload-without-colons')).toBeNull();
      expect(decryptMetadata('part1:part2')).toBeNull(); // Missing data
      expect(decryptMetadata(':tag:data')).toBeNull(); // Missing iv
    });

    it('fails to decrypt when ciphertext or auth tag is corrupted', () => {
      const encrypted = encryptMetadata({ secure: 'value' });
      const [iv, tag, data] = encrypted.split(':');
      // Corrupt the data hex
      const corruptedData = data.slice(0, -2) + 'ff';
      const corruptedPayload = `${iv}:${tag}:${corruptedData}`;

      expect(() => decryptMetadata(corruptedPayload)).toThrow();
    });
  });
});
