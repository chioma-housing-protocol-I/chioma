const BASE_DELAY_MS = 500;

export function getRetryDelay(attempt: number) {
  return BASE_DELAY_MS * 2 ** Math.max(0, attempt - 1);
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  options?: {
    maxAttempts?: number;
    shouldRetry?: (error: unknown) => boolean;
  },
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? 3;
  const shouldRetry = options?.shouldRetry ?? (() => true);

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const canRetry = attempt < maxAttempts && shouldRetry(error);
      if (!canRetry) break;
      await new Promise((resolve) =>
        setTimeout(resolve, getRetryDelay(attempt)),
      );
    }
  }

  throw lastError;
}
