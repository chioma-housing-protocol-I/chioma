import {
  PAYMENT_WEBHOOK_BACKOFF_BASE_MS,
  computeWebhookBackoffDelayMs,
  isRetryableWebhookProcessingError,
} from './payment-webhook-retry';

describe('payment-webhook-retry', () => {
  it('uses 1s,2s,4s,8s backoff bases with bounded full jitter', () => {
    expect(PAYMENT_WEBHOOK_BACKOFF_BASE_MS).toEqual([1000, 2000, 4000, 8000]);
    expect(computeWebhookBackoffDelayMs(0, () => 0)).toBe(0);
    expect(computeWebhookBackoffDelayMs(0, () => 0.999)).toBe(1000);
    expect(computeWebhookBackoffDelayMs(1, () => 0.5)).toBeGreaterThanOrEqual(0);
    expect(computeWebhookBackoffDelayMs(1, () => 0.5)).toBeLessThanOrEqual(2000);
    expect(computeWebhookBackoffDelayMs(3, () => 1)).toBe(8000);
  });

  it('treats transient infra/database errors as retryable and deterministic 4xx as non-retryable', () => {
    expect(
      isRetryableWebhookProcessingError(
        Object.assign(new Error('db timeout'), { code: 'ETIMEDOUT' }),
      ),
    ).toBe(true);
    expect(
      isRetryableWebhookProcessingError(
        Object.assign(new Error('server error'), { status: 503 }),
      ),
    ).toBe(true);
    expect(
      isRetryableWebhookProcessingError(
        Object.assign(new Error('too many requests'), { status: 429 }),
      ),
    ).toBe(true);
    expect(
      isRetryableWebhookProcessingError(
        Object.assign(new Error('bad request'), { status: 400 }),
      ),
    ).toBe(false);
  });
});
