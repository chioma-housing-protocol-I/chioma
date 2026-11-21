import { ConfigService } from '@nestjs/config';
import { TransactionSubmissionPoolService } from './transaction-submission-pool.service';

jest.mock('@stellar/stellar-sdk', () => {
  const buildTx = () => ({
    sign: jest.fn(),
    hash: () => Buffer.from('hash'),
  });
  return {
    Horizon: {
      Server: jest.fn().mockImplementation(() => ({
        loadAccount: jest.fn().mockResolvedValue({ accountId: 'GABC', sequence: '1' }),
      })),
    },
    TransactionBuilder: jest.fn().mockImplementation(() => {
      const builder: any = {
        addOperation: jest.fn(() => builder),
        setTimeout: jest.fn(() => builder),
        build: jest.fn(() => buildTx()),
      };
      return builder;
    }),
  };
});

describe('TransactionSubmissionPoolService', () => {
  const configService = {
    get: jest.fn().mockReturnValue({
      network: 'testnet',
      networkPassphrase: 'Test SDF Network ; September 2015',
      horizonUrl: 'https://horizon-testnet.stellar.org',
      baseFee: '100',
      encryptionKey: 'k',
      friendbotUrl: 'https://friendbot.stellar.org',
    }),
  } as unknown as ConfigService;

  beforeEach(() => {
    jest.useFakeTimers();
    process.env.STELLAR_SUBMISSION_POOL_FLUSH_MS = '10';
    process.env.STELLAR_SUBMISSION_POOL_MAX_BATCH = '10';
  });

  afterEach(async () => {
    jest.useRealTimers();
    delete process.env.STELLAR_SUBMISSION_POOL_FLUSH_MS;
    delete process.env.STELLAR_SUBMISSION_POOL_MAX_BATCH;
  });

  it('batches multiple enqueued submissions for the same source into one submit', async () => {
    const service = new TransactionSubmissionPoolService(configService);
    const submit = jest.fn().mockResolvedValue({ hash: 'batch-hash', ledger: 123 });

    const p1 = service.enqueue({
      sourcePublicKey: 'GSOURCE',
      sourceKeypair: {} as any,
      buildOperations: () => [{} as any],
      submit,
    });
    const p2 = service.enqueue({
      sourcePublicKey: 'GSOURCE',
      sourceKeypair: {} as any,
      buildOperations: () => [{} as any],
      submit,
    });

    await jest.advanceTimersByTimeAsync(15);
    const [r1, r2] = await Promise.all([p1, p2]);

    expect(submit).toHaveBeenCalledTimes(1);
    expect(r1).toEqual({ hash: 'batch-hash', ledger: 123 });
    expect(r2).toEqual({ hash: 'batch-hash', ledger: 123 });
    await service.onModuleDestroy();
  });

  it('rejects queued items when the pooled submission fails', async () => {
    const service = new TransactionSubmissionPoolService(configService);
    const submit = jest.fn().mockRejectedValue(new Error('submit failed'));

    const p1 = service.enqueue({
      sourcePublicKey: 'GSOURCE',
      sourceKeypair: {} as any,
      buildOperations: () => [{} as any],
      submit,
    });
    const p2 = service.enqueue({
      sourcePublicKey: 'GSOURCE',
      sourceKeypair: {} as any,
      buildOperations: () => [{} as any],
      submit,
    });

    const assertions = Promise.all([
      expect(p1).rejects.toThrow('submit failed'),
      expect(p2).rejects.toThrow('submit failed'),
    ]);
    await jest.advanceTimersByTimeAsync(15);
    await assertions;
    expect(submit).toHaveBeenCalled();
    await service.onModuleDestroy();
  });

  it('rejects when queue capacity is exceeded', async () => {
    process.env.STELLAR_SUBMISSION_POOL_MAX_QUEUE = '1';
    process.env.STELLAR_SUBMISSION_POOL_FLUSH_MS = '100';
    const service = new TransactionSubmissionPoolService(configService);
    const submit = jest.fn().mockResolvedValue({ hash: 'h', ledger: 1 });

    void service.enqueue({
      sourcePublicKey: 'GSOURCE',
      sourceKeypair: {} as any,
      buildOperations: () => [{} as any],
      submit,
    });

    await expect(
      service.enqueue({
        sourcePublicKey: 'GSOURCE',
        sourceKeypair: {} as any,
        buildOperations: () => [{} as any],
        submit,
      }),
    ).rejects.toThrow(/queue is full/i);

    await jest.advanceTimersByTimeAsync(120);
    await service.onModuleDestroy();
    delete process.env.STELLAR_SUBMISSION_POOL_MAX_QUEUE;
  });
});
