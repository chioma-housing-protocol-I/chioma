import { BadRequestException } from '@nestjs/common';
import { PaymentInterval } from './entities/payment-schedule.entity';
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
