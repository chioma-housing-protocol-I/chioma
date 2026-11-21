import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentInterval } from './entities/payment-schedule.entity';
import { PaymentStatus } from './entities/payment.entity';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';

export function ensureUserId(userId: string): void {
  if (!userId) {
    throw new BadRequestException('User ID is required');
  }
}

/**
 * Shared null/undefined assertion for payment service entry points. Keeping
 * this in one place makes the guard message consistent across every method
 * instead of repeating `if (!x) throw` throughout a large service.
 */
export function requireValue<T>(
  value: T | null | undefined,
  message: string,
): T {
  if (value === null || value === undefined) {
    throw new BadRequestException(message);
  }
  return value;
}

/** Rejects null, undefined, empty and whitespace-only identifiers. */
export function requireNonEmptyString(
  value: string | null | undefined,
  fieldName: string,
): string {
  const required = requireValue(value, `${fieldName} is required`);
  if (required.trim().length === 0) {
    throw new BadRequestException(`${fieldName} is required`);
  }
  return required;
}

/**
 * Validates a currency amount and preserves the messages callers already
 * rely on for recordPayment's bounds checks.
 */
export function requirePositiveAmount(
  amount: number | null | undefined,
): number {
  const required = requireValue(amount, 'Payment amount is required');
  if (!Number.isFinite(required) || Number.isNaN(required)) {
    throw new BadRequestException('Payment amount must be a valid number');
  }
  if (required <= 0) {
    throw new BadRequestException('Payment amount must be greater than 0');
  }
  if (required > 999999999.99) {
    throw new BadRequestException(
      'Payment amount cannot exceed 999,999,999.99',
    );
  }
  if (!Number.isInteger(required * 100)) {
    throw new BadRequestException(
      'Payment amount can have at most 2 decimal places',
    );
  }
  return required;
}

/** Converts a missing lookup result into a consistent domain error. */
export function requireEntity<T>(
  value: T | null | undefined,
  message: string,
): T {
  if (value === null || value === undefined) {
    throw new NotFoundException(message);
  }
  return value;
}

export function getIdempotencyKey(dto: {
  idempotencyKey?: unknown;
}): string | null {
  return typeof dto.idempotencyKey === 'string' ? dto.idempotencyKey : null;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

export function calculateNextRunAt(
  date: Date,
  interval: PaymentInterval,
): Date {
  const next = new Date(date.getTime());
  switch (interval) {
    case PaymentInterval.WEEKLY:
      return addDays(next, 7);
    case PaymentInterval.MONTHLY:
      next.setMonth(next.getMonth() + 1);
      return next;
    case PaymentInterval.QUARTERLY:
      next.setMonth(next.getMonth() + 3);
      return next;
    case PaymentInterval.YEARLY:
      next.setFullYear(next.getFullYear() + 1);
      return next;
    default:
      return addDays(next, 30);
  }
}

export function parseEscrowReference(referenceNumber: string): number | null {
  if (referenceNumber?.startsWith('escrow:')) {
    const escrowIdStr = referenceNumber.substring('escrow:'.length);
    const escrowId = parseInt(escrowIdStr, 10);
    return isNaN(escrowId) ? null : escrowId;
  }
  return null;
}

/**
 * Single source of truth for mapping external status strings — payment
 * gateway webhook statuses and Stellar escrow states — to the internal
 * PaymentStatus enum. Used by both PaymentService.mapWebhookStatus() and
 * PaymentService.syncEscrowPaymentFromState().
 */
export const PAYMENT_STATUS_MAP: Record<string, PaymentStatus> = {
  // Payment gateway webhook statuses
  completed: PaymentStatus.COMPLETED,
  successful: PaymentStatus.COMPLETED,
  success: PaymentStatus.COMPLETED,
  pending: PaymentStatus.PENDING,
  processing: PaymentStatus.PENDING,
  error: PaymentStatus.FAILED,
  cancelled: PaymentStatus.FAILED,
  // Escrow states
  active: PaymentStatus.PENDING,
  released: PaymentStatus.COMPLETED,
  expired: PaymentStatus.FAILED,
  // Shared by both webhook and escrow status vocabularies
  failed: PaymentStatus.FAILED,
  refunded: PaymentStatus.REFUNDED,
};

export function encryptMetadata(data: Record<string, unknown>): string {
  const secret = process.env.PAYMENT_METADATA_SECRET;
  if (!secret) {
    throw new BadRequestException(
      'PAYMENT_METADATA_SECRET is required to store sensitive metadata',
    );
  }

  const iv = randomBytes(12);
  const key = createHash('sha256').update(secret).digest();
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const payload = Buffer.from(JSON.stringify(data));
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptMetadata(
  payload: string | null,
): Record<string, unknown> | null {
  if (!payload) {
    return null;
  }

  const secret = process.env.PAYMENT_METADATA_SECRET;
  if (!secret) {
    return null;
  }

  const [ivHex, tagHex, dataHex] = payload.split(':');
  if (!ivHex || !tagHex || !dataHex) {
    return null;
  }

  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const data = Buffer.from(dataHex, 'hex');
  const key = createHash('sha256').update(secret).digest();
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return JSON.parse(decrypted.toString('utf8')) as Record<string, unknown>;
}
