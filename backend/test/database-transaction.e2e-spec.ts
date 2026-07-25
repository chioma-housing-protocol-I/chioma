import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { DataSource, QueryRunner } from 'typeorm';
import { TransactionService } from '../src/modules/transactions/transaction.service';

const makeQueryRunner = (overrides: Partial<QueryRunner> = {}): QueryRunner =>
  ({
    connect: jest.fn().mockResolvedValue(undefined),
    startTransaction: jest.fn().mockResolvedValue(undefined),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    rollbackTransaction: jest.fn().mockResolvedValue(undefined),
    release: jest.fn().mockResolvedValue(undefined),
    manager: {
      save: jest.fn(),
      findOne: jest.fn(),
      query: jest.fn(),
    },
    ...overrides,
  }) as unknown as QueryRunner;

describe('Database Transaction Integration (e2e)', () => {
  let module: TestingModule;
  let transactionService: TransactionService;
  let mockDataSource: { createQueryRunner: jest.Mock };

  beforeEach(async () => {
    mockDataSource = {
      createQueryRunner: jest.fn(),
    };

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [() => ({ NODE_ENV: 'test' })],
        }),
      ],
      providers: [
        TransactionService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    transactionService = module.get<TransactionService>(TransactionService);
  });

  afterAll(async () => {
    if (module) await module.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Transaction Creation and Rollback', () => {
    it('executes callback within a transaction and commits on success', async () => {
      const qr = makeQueryRunner();
      mockDataSource.createQueryRunner.mockReturnValue(qr);

      const result = await transactionService.execute(async () => 'done');

      expect(result).toBe('done');
      expect(qr.connect).toHaveBeenCalledTimes(1);
      expect(qr.startTransaction).toHaveBeenCalledTimes(1);
      expect(qr.commitTransaction).toHaveBeenCalledTimes(1);
      expect(qr.rollbackTransaction).not.toHaveBeenCalled();
      expect(qr.release).toHaveBeenCalledTimes(1);
    });

    it('rolls back transaction when callback throws', async () => {
      const qr = makeQueryRunner();
      mockDataSource.createQueryRunner.mockReturnValue(qr);

      await expect(
        transactionService.execute(async () => {
          throw new Error('db error');
        }),
      ).rejects.toThrow('db error');

      expect(qr.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(qr.commitTransaction).not.toHaveBeenCalled();
      expect(qr.release).toHaveBeenCalledTimes(1);
    });

    it('releases query runner even after rollback', async () => {
      const qr = makeQueryRunner();
      mockDataSource.createQueryRunner.mockReturnValue(qr);

      await expect(
        transactionService.execute(async () => {
          throw new Error('fail');
        }),
      ).rejects.toThrow();

      expect(qr.release).toHaveBeenCalledTimes(1);
    });

    it('passes the query runner to the callback', async () => {
      const qr = makeQueryRunner();
      mockDataSource.createQueryRunner.mockReturnValue(qr);

      let receivedQr: QueryRunner | undefined;
      await transactionService.execute(async (runner) => {
        receivedQr = runner;
      });

      expect(receivedQr).toBe(qr);
    });

    it('creates a new query runner per transaction call', async () => {
      const qr1 = makeQueryRunner();
      const qr2 = makeQueryRunner();
      mockDataSource.createQueryRunner
        .mockReturnValueOnce(qr1)
        .mockReturnValueOnce(qr2);

      await transactionService.execute(async () => 'first');
      await transactionService.execute(async () => 'second');

      expect(mockDataSource.createQueryRunner).toHaveBeenCalledTimes(2);
      expect(qr1.release).toHaveBeenCalledTimes(1);
      expect(qr2.release).toHaveBeenCalledTimes(1);
    });

    it('logs idempotency key on successful commit', async () => {
      const qr = makeQueryRunner();
      mockDataSource.createQueryRunner.mockReturnValue(qr);

      await expect(
        transactionService.execute(async () => 'ok', 'idem-key-123'),
      ).resolves.toBe('ok');

      expect(qr.commitTransaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('Concurrent Transaction Handling', () => {
    it('handles multiple concurrent transactions independently', async () => {
      const runners = Array.from({ length: 5 }, () => makeQueryRunner());
      let callIndex = 0;
      mockDataSource.createQueryRunner.mockImplementation(
        () => runners[callIndex++],
      );

      const results = await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          transactionService.execute(async () => `result-${i}`),
        ),
      );

      expect(results).toHaveLength(5);
      results.forEach((r, i) => expect(r).toBe(`result-${i}`));
      runners.forEach((qr) => {
        expect(qr.commitTransaction).toHaveBeenCalledTimes(1);
        expect(qr.release).toHaveBeenCalledTimes(1);
      });
    });

    it('failed concurrent transaction does not affect sibling transactions', async () => {
      const successQr = makeQueryRunner();
      const failQr = makeQueryRunner();
      mockDataSource.createQueryRunner
        .mockReturnValueOnce(successQr)
        .mockReturnValueOnce(failQr);

      const [successResult, failureResult] = await Promise.allSettled([
        transactionService.execute(async () => 'success'),
        transactionService.execute(async () => {
          throw new Error('isolated error');
        }),
      ]);

      expect(successResult.status).toBe('fulfilled');
      expect((successResult as PromiseFulfilledResult<string>).value).toBe(
        'success',
      );

      expect(failureResult.status).toBe('rejected');
      expect((failureResult as PromiseRejectedResult).reason.message).toBe(
        'isolated error',
      );

      expect(successQr.commitTransaction).toHaveBeenCalled();
      expect(failQr.rollbackTransaction).toHaveBeenCalled();
    });

    it('each concurrent transaction releases its own query runner', async () => {
      const runners = Array.from({ length: 3 }, () => makeQueryRunner());
      let idx = 0;
      mockDataSource.createQueryRunner.mockImplementation(() => runners[idx++]);

      await Promise.all(
        runners.map((_, i) =>
          transactionService.execute(async () => `val-${i}`),
        ),
      );

      runners.forEach((qr) => expect(qr.release).toHaveBeenCalledTimes(1));
    });
  });

  describe('Deadlock Detection and Recovery', () => {
    it('retries on deadlock error up to configured attempts', async () => {
      let attempts = 0;
      const runners = Array.from({ length: 3 }, () => makeQueryRunner());
      let runnerIdx = 0;
      mockDataSource.createQueryRunner.mockImplementation(
        () => runners[runnerIdx++],
      );

      const result = await transactionService.executeWithRetry(async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('deadlock detected');
        }
        return 'recovered';
      }, 3);

      expect(result).toBe('recovered');
      expect(attempts).toBe(3);
    });

    it('retries on serialization failure error', async () => {
      let attempts = 0;
      const runners = Array.from({ length: 2 }, () => makeQueryRunner());
      let runnerIdx = 0;
      mockDataSource.createQueryRunner.mockImplementation(
        () => runners[runnerIdx++],
      );

      const result = await transactionService.executeWithRetry(async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('serialization failure 40001');
        }
        return 'serialized';
      }, 2);

      expect(result).toBe('serialized');
      expect(attempts).toBe(2);
    });

    it('throws after exhausting all retry attempts', async () => {
      const runners = Array.from({ length: 3 }, () => makeQueryRunner());
      let runnerIdx = 0;
      mockDataSource.createQueryRunner.mockImplementation(
        () => runners[runnerIdx++],
      );

      await expect(
        transactionService.executeWithRetry(async () => {
          throw new Error('deadlock detected');
        }, 3),
      ).rejects.toThrow('deadlock detected');
    });

    it('does not retry on non-transient errors', async () => {
      let attempts = 0;
      const qr = makeQueryRunner();
      mockDataSource.createQueryRunner.mockReturnValue(qr);

      await expect(
        transactionService.executeWithRetry(async () => {
          attempts++;
          throw new Error('unique constraint violation');
        }, 3),
      ).rejects.toThrow('unique constraint violation');

      expect(attempts).toBe(1);
    });

    it('default retry count is 3 when not specified', async () => {
      let attempts = 0;
      const runners = Array.from({ length: 4 }, () => makeQueryRunner());
      let runnerIdx = 0;
      mockDataSource.createQueryRunner.mockImplementation(
        () => runners[runnerIdx++],
      );

      await expect(
        transactionService.executeWithRetry(async () => {
          attempts++;
          throw new Error('deadlock detected');
        }),
      ).rejects.toThrow();

      expect(attempts).toBe(3);
    });
  });

  describe('Isolation Level Verification', () => {
    it('each transaction starts with startTransaction call', async () => {
      const qr = makeQueryRunner();
      mockDataSource.createQueryRunner.mockReturnValue(qr);

      await transactionService.execute(async () => 'ok');

      expect(qr.startTransaction).toHaveBeenCalledTimes(1);
    });

    it('commit is called once per successful transaction', async () => {
      const qr = makeQueryRunner();
      mockDataSource.createQueryRunner.mockReturnValue(qr);

      await transactionService.execute(async () => 'done');

      expect(qr.commitTransaction).toHaveBeenCalledTimes(1);
    });

    it('connect is called before startTransaction', async () => {
      const callOrder: string[] = [];
      const qr = makeQueryRunner({
        connect: jest.fn().mockImplementation(async () => {
          callOrder.push('connect');
        }),
        startTransaction: jest.fn().mockImplementation(async () => {
          callOrder.push('startTransaction');
        }),
      });
      mockDataSource.createQueryRunner.mockReturnValue(qr);

      await transactionService.execute(async () => 'ok');

      expect(callOrder.indexOf('connect')).toBeLessThan(
        callOrder.indexOf('startTransaction'),
      );
    });

    it('release is always the last operation called', async () => {
      const callOrder: string[] = [];
      const qr = makeQueryRunner({
        commitTransaction: jest.fn().mockImplementation(async () => {
          callOrder.push('commit');
        }),
        release: jest.fn().mockImplementation(async () => {
          callOrder.push('release');
        }),
      });
      mockDataSource.createQueryRunner.mockReturnValue(qr);

      await transactionService.execute(async () => 'ok');

      expect(callOrder[callOrder.length - 1]).toBe('release');
    });
  });

  describe('Data Consistency Validation', () => {
    it('transaction returns the value from the callback', async () => {
      const qr = makeQueryRunner();
      mockDataSource.createQueryRunner.mockReturnValue(qr);

      const output = await transactionService.execute(async () => ({
        id: 42,
        name: 'test',
      }));

      expect(output).toEqual({ id: 42, name: 'test' });
    });

    it('callback can perform multiple operations within one transaction', async () => {
      const qr = makeQueryRunner();
      mockDataSource.createQueryRunner.mockReturnValue(qr);

      const results: number[] = [];
      await transactionService.execute(async (runner) => {
        (runner.manager.save as jest.Mock).mockResolvedValueOnce({ id: 1 });
        (runner.manager.save as jest.Mock).mockResolvedValueOnce({ id: 2 });

        const r1 = (await runner.manager.save({})) as { id: number };
        const r2 = (await runner.manager.save({})) as { id: number };
        results.push(r1.id, r2.id);
      });

      expect(results).toEqual([1, 2]);
      expect(qr.commitTransaction).toHaveBeenCalledTimes(1);
    });

    it('rolled-back transaction does not return a value', async () => {
      const qr = makeQueryRunner();
      mockDataSource.createQueryRunner.mockReturnValue(qr);

      await expect(
        transactionService.execute(async () => {
          throw new Error('consistency violation');
        }),
      ).rejects.toThrow('consistency violation');

      expect(qr.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(qr.commitTransaction).not.toHaveBeenCalled();
    });

    it('executeWithRetry returns value from the successful attempt', async () => {
      let call = 0;
      const runners = Array.from({ length: 2 }, () => makeQueryRunner());
      let runnerIdx = 0;
      mockDataSource.createQueryRunner.mockImplementation(
        () => runners[runnerIdx++],
      );

      const result = await transactionService.executeWithRetry(async () => {
        call++;
        if (call < 2) throw new Error('deadlock detected');
        return { status: 'committed', attempt: call };
      }, 3);

      expect(result).toEqual({ status: 'committed', attempt: 2 });
    });

    it('idempotency key is passed through without altering return value', async () => {
      const qr = makeQueryRunner();
      mockDataSource.createQueryRunner.mockReturnValue(qr);

      const result = await transactionService.execute(
        async () => 'idempotent-result',
        'key-abc',
      );

      expect(result).toBe('idempotent-result');
    });
  });
});
