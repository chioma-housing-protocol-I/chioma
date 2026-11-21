import { Logger } from '@nestjs/common';
import { safeEventListener } from './safe-event-listener';

describe('safeEventListener (#2180)', () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns the listener result on success', async () => {
    const listener = safeEventListener('test.listener', async () => 'done');

    await expect(listener({} as never)).resolves.toBe('done');
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('catches synchronous throws and logs the stack trace', async () => {
    const listener = safeEventListener('test.sync', () => {
      throw new Error('sync boom');
    });

    await expect(listener({} as never)).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('test.sync'),
      expect.stringContaining('Error: sync boom'),
    );
  });

  it('catches rejected promises so no unhandled rejection escapes', async () => {
    const listener = safeEventListener('test.async', async () => {
      throw new Error('async boom');
    });

    await expect(listener({} as never)).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('test.async'),
      expect.stringContaining('Error: async boom'),
    );
  });

  it('handles non-Error rejection values', async () => {
    // Deliberately reject with a string: the wrapper must normalise any
    // thrown value, not just Error instances.

    const listener = safeEventListener('test.string', () =>
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
      Promise.reject('plain failure'),
    );

    await expect(listener({} as never)).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('test.string'),
      'plain failure',
    );
  });
});
