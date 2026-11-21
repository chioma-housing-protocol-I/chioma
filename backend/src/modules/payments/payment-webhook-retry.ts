export const PAYMENT_WEBHOOK_BACKOFF_BASE_MS = [1000, 2000, 4000, 8000] as const;

export function computeWebhookBackoffDelayMs(
  attemptIndex: number,
  random: () => number = Math.random,
): number {
  const base =
    PAYMENT_WEBHOOK_BACKOFF_BASE_MS[
      Math.min(attemptIndex, PAYMENT_WEBHOOK_BACKOFF_BASE_MS.length - 1)
    ];
  // Full jitter in [0, base] to avoid thundering-herd retries.
  const jitter = Math.floor(Math.max(0, Math.min(1, random())) * (base + 1));
  return jitter;
}

export function isRetryableWebhookProcessingError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const anyErr = error as any;
  const status = anyErr.status ?? anyErr.statusCode ?? anyErr.response?.status;
  if (typeof status === 'number') {
    if (status >= 500) return true;
    if (status === 429 || status === 408) return true;
    if (status >= 400 && status < 500) return false;
  }

  const code = String(anyErr.code ?? '').toUpperCase();
  if (
    [
      'ECONNRESET',
      'ETIMEDOUT',
      'ECONNREFUSED',
      'ENOTFOUND',
      'EPIPE',
      'EAI_AGAIN',
      'ECONNABORTED',
    ].includes(code)
  ) {
    return true;
  }

  const name = String(anyErr.name ?? '');
  if (name === 'QueryFailedError' || name === 'TimeoutError') return true;

  const message = String(anyErr.message ?? '').toLowerCase();
  if (
    message.includes('timeout') ||
    message.includes('timed out') ||
    message.includes('deadlock') ||
    message.includes('connection') ||
    message.includes('econnreset') ||
    message.includes('temporar') ||
    message.includes('lock wait') ||
    message.includes('too many connections')
  ) {
    return true;
  }

  // Default to non-retryable to avoid duplicate side effects on deterministic failures.
  return false;
}

export async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
