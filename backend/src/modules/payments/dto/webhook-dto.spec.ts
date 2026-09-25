import { BadRequestException } from '@nestjs/common';
import {
  paymentWebhookSchema,
  parsePaymentWebhookDto,
} from './payment-webhook.dto';
import {
  refundWebhookSchema,
  parseRefundWebhookDto,
} from './refund-webhook.dto';

describe('PaymentWebhookDto (zod)', () => {
  it('accepts a valid payment webhook payload', () => {
    const parsed = paymentWebhookSchema.parse({
      eventType: 'payment.completed',
      paymentId: 'pay_1',
      status: 'completed',
      transactionHash: 'tx_1',
    });
    expect(parsed.paymentId).toBe('pay_1');
  });

  it('accepts referenceNumber without paymentId', () => {
    expect(
      parsePaymentWebhookDto({
        eventType: 'payment.failed',
        referenceNumber: 'ref_1',
        status: 'failed',
      }),
    ).toMatchObject({ referenceNumber: 'ref_1', status: 'failed' });
  });

  it('rejects missing eventType', () => {
    expect(() =>
      parsePaymentWebhookDto({ paymentId: 'pay_1', status: 'completed' }),
    ).toThrow(BadRequestException);
  });

  it('rejects payloads without paymentId or referenceNumber', () => {
    expect(() =>
      parsePaymentWebhookDto({
        eventType: 'payment.completed',
        status: 'completed',
      }),
    ).toThrow(/paymentId or referenceNumber/);
  });
});

describe('RefundWebhookDto (zod)', () => {
  it('accepts a valid refund webhook payload', () => {
    const parsed = refundWebhookSchema.parse({
      eventType: 'refund.completed',
      paymentId: 'pay_1',
      refundId: 're_1',
      amount: 25,
      status: 'completed',
    });
    expect(parsed.refundId).toBe('re_1');
  });

  it('rejects non-positive amount', () => {
    expect(
      refundWebhookSchema.safeParse({
        eventType: 'refund.completed',
        paymentId: 'pay_1',
        amount: 0,
        status: 'completed',
      }).success,
    ).toBe(false);
  });

  it('throws BadRequestException with a helpful message', () => {
    expect(() =>
      parseRefundWebhookDto({
        eventType: 'refund.completed',
        status: 'completed',
      }),
    ).toThrow(BadRequestException);
    expect(() =>
      parseRefundWebhookDto({
        eventType: 'refund.completed',
        status: 'completed',
      }),
    ).toThrow(/Invalid refund webhook payload/);
  });
});
