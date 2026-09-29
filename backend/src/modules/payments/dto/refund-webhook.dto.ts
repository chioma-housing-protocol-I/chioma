import { BadRequestException } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';

/**
 * Zod schema for inbound refund webhook payloads from payment gateways.
 *
 * Requires a payment locator (`paymentId` or `referenceNumber`) plus a
 * refund status so the handler can update refund state safely.
 */
export const refundWebhookSchema = z
  .object({
    eventType: z.string().min(1, 'eventType is required'),
    idempotencyKey: z.string().uuid('idempotencyKey must be a UUID'),
    timestamp: z.string().datetime('timestamp must be an ISO-8601 date-time'),
    paymentId: z.string().min(1).optional(),
    referenceNumber: z.string().min(1).optional(),
    refundId: z.string().min(1).optional(),
    amount: z.number().positive().optional(),
    currency: z.string().min(1).optional(),
    status: z.string().min(1, 'status is required'),
    reason: z.string().optional(),
    error: z.string().optional(),
  })
  .refine(
    (data) =>
      Math.abs(Date.now() - Date.parse(data.timestamp)) <= 5 * 60 * 1000,
    {
      message: 'timestamp must be within 5 minutes of the current time',
      path: ['timestamp'],
    },
  )
  .refine((data) => Boolean(data.paymentId || data.referenceNumber), {
    message: 'Either paymentId or referenceNumber is required',
    path: ['paymentId'],
  });

export type RefundWebhookPayload = z.infer<typeof refundWebhookSchema>;

function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('; ');
}

/**
 * Runtime-validate a refund webhook body.
 */
export function parseRefundWebhookDto(value: unknown): RefundWebhookPayload {
  const result = refundWebhookSchema.safeParse(value);
  if (!result.success) {
    throw new BadRequestException(
      `Invalid refund webhook payload: ${formatZodError(result.error)}`,
    );
  }
  return result.data;
}

/**
 * Nest/Swagger DTO for refund webhooks.
 */
export class RefundWebhookDto {
  @ApiProperty({ example: 'refund.completed' })
  eventType: string;

  @ApiProperty({ example: '0f7b87dd-c76d-4f24-a4d6-8c0dc5ad5a6d' })
  idempotencyKey: string;

  @ApiProperty({ example: '2026-09-25T06:30:00.000Z' })
  timestamp: string;

  @ApiPropertyOptional({ example: 'pay_abc123' })
  paymentId?: string;

  @ApiPropertyOptional({ example: 'ref_xyz' })
  referenceNumber?: string;

  @ApiPropertyOptional({ example: 're_456' })
  refundId?: string;

  @ApiPropertyOptional({ example: 50.0 })
  amount?: number;

  @ApiPropertyOptional({ example: 'USD' })
  currency?: string;

  @ApiProperty({ example: 'completed' })
  status: string;

  @ApiPropertyOptional()
  reason?: string;

  @ApiPropertyOptional()
  error?: string;
}
