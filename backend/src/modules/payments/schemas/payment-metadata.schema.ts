import { BadRequestException } from '@nestjs/common';
import { z } from 'zod';

/**
 * Known metadata fields written by the payment gateway, Stellar, and
 * reconciliation flows. `.passthrough()` keeps the field extensible (mirrors
 * the previous `& Record<string, unknown>` intersection) while still
 * validating the type of every field callers already rely on, e.g.
 * `metadata.chargeId` used to trim/refund against.
 */
export const paymentMetadataSchema = z
  .object({
    chargeId: z.string().optional(),
    refundId: z.string().optional(),
    gateway: z.string().optional(),
    flow: z.string().optional(),
    transactionHash: z.string().optional(),
    escrowId: z.number().optional(),
    escrowStatus: z.string().optional(),
    reconciledAt: z.string().optional(),
    retryAttempts: z.number().optional(),
    webhookEventType: z.string().optional(),
    error: z.string().optional(),
  })
  .passthrough();

export type PaymentMetadata = z.infer<typeof paymentMetadataSchema>;

export const paymentMethodMetadataSchema = z.record(z.string(), z.unknown());

export type PaymentMethodMetadata = z.infer<typeof paymentMethodMetadataSchema>;

function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('; ');
}

/**
 * Validates payment metadata at a read/write boundary. Returns `null` as-is
 * (the column is nullable); throws a 400 for anything that fails the schema
 * instead of letting malformed data reach the database or API response.
 */
export function parsePaymentMetadata(value: unknown): PaymentMetadata | null {
  if (value === null || value === undefined) {
    return null;
  }

  const result = paymentMetadataSchema.safeParse(value);
  if (!result.success) {
    throw new BadRequestException(
      `Invalid payment metadata: ${formatZodError(result.error)}`,
    );
  }

  return result.data;
}

export function parsePaymentMethodMetadata(
  value: unknown,
): PaymentMethodMetadata | null {
  if (value === null || value === undefined) {
    return null;
  }

  const result = paymentMethodMetadataSchema.safeParse(value);
  if (!result.success) {
    throw new BadRequestException(
      `Invalid payment method metadata: ${formatZodError(result.error)}`,
    );
  }

  return result.data;
}
