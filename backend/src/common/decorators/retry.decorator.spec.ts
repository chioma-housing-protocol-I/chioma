import { Retry } from './retry.decorator';
import {
  MaxRetriesExceededError,
  NetworkError,
  TimeoutError,
} from '../errors/retry-errors';

jest.useFakeTimers();

// Helper: build a plain class instance whose method has @Retry applied
function buildTarget(
  impl: () => Promise<unknown>,
  options: Parameters<typeof Retry>[0] = {},
) {
  class Target {
    @Retry(options)
    async call() {
      return impl();
    }
  }
  return new Target();
}

describe('@Retry decorator', () => {
  afterEach(() => jest.clearAllTimers());

  it('returns the result when the first attempt succeeds', async () => {
    const impl = jest.fn().mockResolvedValue('hello');
    const target = buildTarget(impl);

    const result = await target.call();
    expect(result).toBe('hello');
    expect(impl).toHaveBeenCalledTimes(1);
  });

  it('retries and succeeds on the second attempt', async () => {
    const impl = jest
      .fn()
      .mockRejectedValueOnce(new NetworkError())
      .mockResolvedValue('ok');

    const target = buildTarget(impl, {
      maxAttempts: 3,
      delay: 10,
      backoff: 'exponential',
      backoffMultiplier: 2,
    });

    const promise = target.call();
    await jest.runAllTimersAsync();
    expect(await promise).toBe('ok');
    expect(impl).toHaveBeenCalledTimes(2);
  });

  it('throws MaxRetriesExceededError after all attempts fail', async () => {
    const impl = jest.fn().mockRejectedValue(new NetworkError('fail'));

    const target = buildTarget(impl, {
      maxAttempts: 3,
      delay: 10,
      backoff: 'exponential',
      backoffMultiplier: 2,
    });

    const promise = target.call();
    // Attach rejection handler BEFORE advancing timers to avoid unhandled-rejection warnings
    const assertion = expect(promise).rejects.toBeInstanceOf(
      MaxRetriesExceededError,
    );
    await jest.runAllTimersAsync();
    await assertion;
    expect(impl).toHaveBeenCalledTimes(3);
  });

  it('does not retry non-retryable errors when retryableErrors is set', async () => {
    const impl = jest.fn().mockRejectedValue(new NetworkError());

    const target = buildTarget(impl, {
      maxAttempts: 3,
      delay: 10,
      backoff: 'exponential',
      backoffMultiplier: 2,
      retryableErrors: [TimeoutError], // NetworkError not listed
    });

    // Non-retryable: rejects immediately with no timers
    await expect(target.call()).rejects.toBeInstanceOf(MaxRetriesExceededError);
    expect(impl).toHaveBeenCalledTimes(1);
  });

  it('calls onRetry callback for each retry', async () => {
    const onRetry = jest.fn();
    const impl = jest
      .fn()
      .mockRejectedValueOnce(new NetworkError())
      .mockResolvedValue('done');

    const target = buildTarget(impl, {
      maxAttempts: 3,
      delay: 10,
      backoff: 'exponential',
      backoffMultiplier: 2,
      onRetry,
    });

    const promise = target.call();
    await jest.runAllTimersAsync();
    await promise;

    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(1, expect.any(NetworkError));
  });

  it('preserves `this` context inside the decorated method', async () => {
    class Service {
      value = 42;

      @Retry({
        maxAttempts: 2,
        delay: 10,
        backoff: 'exponential',
        backoffMultiplier: 2,
      })
      async getValue() {
        return this.value;
      }
    }

    const svc = new Service();
    expect(await svc.getValue()).toBe(42);
  });

  it('uses default options when none provided', async () => {
    const impl = jest.fn().mockResolvedValue('default');
    const target = buildTarget(impl); // no options

    const result = await target.call();
    expect(result).toBe('default');
  });

  it('calculates linear backoff delay correctly', async () => {
    const impl = jest
      .fn()
      .mockRejectedValueOnce(new NetworkError())
      .mockRejectedValueOnce(new NetworkError())
      .mockResolvedValue('ok');

    const target = buildTarget(impl, {
      maxAttempts: 3,
      delay: 50,
      backoff: 'linear',
      backoffMultiplier: 1.5,
    });

    const promise = target.call();

    // First delay: 50 * 1 * 1.5 = 75ms
    await jest.advanceTimersByTimeAsync(74);
    expect(impl).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1);
    expect(impl).toHaveBeenCalledTimes(2);

    // Second delay: 50 * 2 * 1.5 = 150ms
    await jest.advanceTimersByTimeAsync(149);
    expect(impl).toHaveBeenCalledTimes(2);
    await jest.advanceTimersByTimeAsync(1);
    expect(impl).toHaveBeenCalledTimes(3);

    expect(await promise).toBe('ok');
  });

  it('calculates exponential backoff delay correctly', async () => {
    const impl = jest
      .fn()
      .mockRejectedValueOnce(new NetworkError())
      .mockRejectedValueOnce(new NetworkError())
      .mockResolvedValue('ok');

    const target = buildTarget(impl, {
      maxAttempts: 3,
      delay: 50,
      backoff: 'exponential',
      backoffMultiplier: 2,
    });

    const promise = target.call();

    // First delay: 50 * 2^0 = 50ms
    await jest.advanceTimersByTimeAsync(49);
    expect(impl).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1);
    expect(impl).toHaveBeenCalledTimes(2);

    // Second delay: 50 * 2^1 = 100ms
    await jest.advanceTimersByTimeAsync(99);
    expect(impl).toHaveBeenCalledTimes(2);
    await jest.advanceTimersByTimeAsync(1);
    expect(impl).toHaveBeenCalledTimes(3);

    expect(await promise).toBe('ok');
  });

  it('handles Axios-specific error status retry validation', async () => {
    const createAxiosError = (status: number) => {
      const err: any = new Error(`Request failed with status code ${status}`);
      err.isAxiosError = true;
      err.response = { status };
      return err;
    };

    const impl500 = jest
      .fn()
      .mockRejectedValueOnce(createAxiosError(500))
      .mockResolvedValue('ok-500');

    const target500 = buildTarget(impl500, { maxAttempts: 2, delay: 10 });
    const promise500 = target500.call();
    await jest.runAllTimersAsync();
    expect(await promise500).toBe('ok-500');

    const impl400 = jest.fn().mockRejectedValueOnce(createAxiosError(400));
    const target400 = buildTarget(impl400, { maxAttempts: 2, delay: 10 });
    await expect(target400.call()).rejects.toThrow(MaxRetriesExceededError);
    expect(impl400).toHaveBeenCalledTimes(1);

    const noResponseError: any = new Error('Network Error');
    noResponseError.isAxiosError = true;

    const implNoRes = jest
      .fn()
      .mockRejectedValueOnce(noResponseError)
      .mockResolvedValue('ok-no-res');

    const targetNoRes = buildTarget(implNoRes, { maxAttempts: 2, delay: 10 });
    const promiseNoRes = targetNoRes.call();
    await jest.runAllTimersAsync();
    expect(await promiseNoRes).toBe('ok-no-res');
  });
});
