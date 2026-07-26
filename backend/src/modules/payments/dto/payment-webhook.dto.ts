import { BadRequestException } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { z } from 'zod';

/**
 * Zod schema for inbound payment gateway webhook payloads.
 *
 * At least one of `paymentId` or `referenceNumber` must be present so the
 * handler can locate the payment row.
 */
export const paymentWebhookSchema = z
  .object({
    eventType: z.string().min(1, 'eventType is required'),
    paymentId: z.string().min(1).optional(),
    referenceNumber: z.string().min(1).optional(),
    status: z.string().min(1, 'status is required'),
    transactionHash: z.string().min(1).optional(),
    error: z.string().optional(),
  })
  .refine((data) => Boolean(data.paymentId || data.referenceNumber), {
    message: 'Either paymentId or referenceNumber is required',
    path: ['paymentId'],
  });

export type PaymentWebhookPayload = z.infer<typeof paymentWebhookSchema>;

function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('; ');
}

/**
 * Runtime-validate a payment webhook body. Throws BadRequestException on
 * schema failure so Nest returns a clear 400 to the gateway.
 */
export function parsePaymentWebhookDto(value: unknown): PaymentWebhookPayload {
  const result = paymentWebhookSchema.safeParse(value);
  if (!result.success) {
    throw new BadRequestException(
      `Invalid payment webhook payload: ${formatZodError(result.error)}`,
    );
  }
  return result.data;
}

/**
 * Nest/Swagger DTO for payment webhooks. Controllers may accept this class
 * for OpenAPI; services should still call `parsePaymentWebhookDto` for
 * runtime Zod validation.
 */
export class PaymentWebhookDto {
  @ApiProperty({ example: 'payment.completed' })
  eventType: string;

  @ApiPropertyOptional({ example: 'pay_abc123' })
  paymentId?: string;

  @ApiPropertyOptional({ example: 'ref_xyz' })
  referenceNumber?: string;

  @ApiProperty({ example: 'completed' })
  status: string;

  @ApiPropertyOptional()
  transactionHash?: string;

  @ApiPropertyOptional()
  error?: string;
}
