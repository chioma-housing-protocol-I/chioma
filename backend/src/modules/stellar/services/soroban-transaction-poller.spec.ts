import {
  pollSorobanTransaction,
  SorobanTransactionFailedError,
  SorobanTransactionTimeoutError,
} from './soroban-transaction-poller';

describe('pollSorobanTransaction', () => {
  it('returns succeeded state when the transaction succeeds', async () => {
    const server = {
      getTransaction: jest
        .fn()
        .mockResolvedValueOnce({ status: 'NOT_FOUND' })
        .mockResolvedValueOnce({ status: 'SUCCESS' }),
    };
    const sleep = jest.fn().mockResolvedValue(undefined);

    const result = await pollSorobanTransaction(server, 'tx_1', {
      maxAttempts: 3,
      initialDelayMs: 100,
      sleep,
    });

    expect(result).toMatchObject({
      hash: 'tx_1',
      state: 'succeeded',
      attempts: 2,
      finalStatus: 'SUCCESS',
    });
    expect(sleep).toHaveBeenCalledWith(100);
  });

  it('throws failed state when the transaction fails', async () => {
    const server = {
      getTransaction: jest.fn().mockResolvedValue({ status: 'FAILED' }),
    };

    await expect(
      pollSorobanTransaction(server, 'tx_2', {
        sleep: jest.fn().mockResolvedValue(undefined),
      }),
    ).rejects.toThrow(SorobanTransactionFailedError);
  });

  it('throws pending timeout when maximum attempts are exhausted', async () => {
    const server = {
      getTransaction: jest.fn().mockResolvedValue({ status: 'NOT_FOUND' }),
    };

    await expect(
      pollSorobanTransaction(server, 'tx_3', {
        maxAttempts: 2,
        initialDelayMs: 1,
        sleep: jest.fn().mockResolvedValue(undefined),
      }),
    ).rejects.toThrow(SorobanTransactionTimeoutError);
  });

  it('uses exponential backoff with a maximum delay', async () => {
    const server = {
      getTransaction: jest
        .fn()
        .mockResolvedValueOnce({ status: 'NOT_FOUND' })
        .mockResolvedValueOnce({ status: 'NOT_FOUND' })
        .mockResolvedValueOnce({ status: 'NOT_FOUND' })
        .mockResolvedValueOnce({ status: 'SUCCESS' }),
    };
    const sleep = jest.fn().mockResolvedValue(undefined);

    await pollSorobanTransaction(server, 'tx_4', {
      maxAttempts: 4,
      initialDelayMs: 100,
      maxDelayMs: 250,
      backoffMultiplier: 2,
      sleep,
    });

    expect(sleep.mock.calls.map(([delay]) => delay)).toEqual([100, 200, 250]);
  });
});
