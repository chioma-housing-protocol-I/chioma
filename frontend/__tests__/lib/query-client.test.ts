import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createQueryClient } from '@/lib/query/client';
import { useErrorStore } from '@/store/errorStore';
import { AppError } from '@/lib/errors';

describe('QueryClient global error handler', () => {
  beforeEach(() => {
    useErrorStore.setState({ errors: [] });
    vi.clearAllMocks();
  });

  it('adds error to errorStore when query fails', async () => {
    const queryClient = createQueryClient();
    const queryCache = queryClient.getQueryCache();

    const mockError = new AppError({
      code: 'NETWORK_TIMEOUT',
      category: 'network',
      severity: 'warning',
      message: 'Connection timed out',
      userMessage: 'The server took too long to respond.',
      recoverable: true,
    });

    // Simulate query error trigger
    queryCache.config.onError?.(mockError, {
      queryKey: ['test-query'],
      meta: {},
    } as any);

    const errors = useErrorStore.getState().errors;
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('The server took too long to respond.');
    expect(errors[0].category).toBe('network');
    expect(errors[0].severity).toBe('warning');
  });

  it('adds error to errorStore when mutation fails', async () => {
    const queryClient = createQueryClient();
    const mutationCache = queryClient.getMutationCache();

    const mockError = new AppError({
      code: 'VALIDATION_INVALID_INPUT',
      category: 'validation',
      severity: 'info',
      message: 'Invalid email',
      userMessage: 'Check your input',
      recoverable: true,
    });

    // Simulate mutation error trigger
    mutationCache.config.onError?.(
      mockError,
      {},
      {},
      {
        meta: {},
      } as any,
      {} as any,
    );

    const errors = useErrorStore.getState().errors;
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('Check your input');
    expect(errors[0].category).toBe('validation');
    expect(errors[0].severity).toBe('info');
  });

  it('does not add error when disableGlobalError meta option is set', async () => {
    const queryClient = createQueryClient();
    const queryCache = queryClient.getQueryCache();

    const mockError = new Error('Test error');

    // Simulate query error trigger with disableGlobalError
    queryCache.config.onError?.(mockError, {
      queryKey: ['test-query'],
      meta: { disableGlobalError: true },
    } as any);

    const errors = useErrorStore.getState().errors;
    expect(errors).toHaveLength(0);
  });
});
