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
});
