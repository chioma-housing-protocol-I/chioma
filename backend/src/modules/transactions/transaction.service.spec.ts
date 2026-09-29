import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { TransactionService } from './transaction.service';

describe('TransactionService', () => {
  let service: TransactionService;

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
  };

  const mockDataSource = {
    createQueryRunner: jest.fn(() => mockQueryRunner),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionService,
        {
          provide: getDataSourceToken(),
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<TransactionService>(TransactionService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    it('connects, starts a transaction, runs the callback, and commits on success', async () => {
      const callback = jest.fn().mockResolvedValue('result');

      const result = await service.execute(callback);

      expect(mockDataSource.createQueryRunner).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.connect).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.startTransaction).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(mockQueryRunner);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.rollbackTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
      expect(result).toBe('result');
    });

    it('rolls back and releases the query runner when the callback throws', async () => {
      const error = new Error('boom');
      const callback = jest.fn().mockRejectedValue(error);

      await expect(service.execute(callback)).rejects.toThrow('boom');

      expect(mockQueryRunner.commitTransaction).not.toHaveBeenCalled();
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
    });

    it('always releases the query runner, even when rollback fails', async () => {
      mockQueryRunner.rollbackTransaction.mockRejectedValueOnce(
        new Error('rollback failed'),
      );
      const callback = jest.fn().mockRejectedValue(new Error('original'));

      await expect(service.execute(callback)).rejects.toThrow(
        'rollback failed',
      );

      expect(mockQueryRunner.release).toHaveBeenCalledTimes(1);
    });

    it('logs without throwing when an idempotency key is supplied', async () => {
      const callback = jest.fn().mockResolvedValue('ok');

      await expect(service.execute(callback, 'idempotent-key')).resolves.toBe(
        'ok',
      );
    });
  });

  describe('executeWithRetry', () => {
    it('returns the result on the first attempt when there is no error', async () => {
      const callback = jest.fn().mockResolvedValue('done');

      const result = await service.executeWithRetry(callback);

      expect(result).toBe('done');
      expect(mockDataSource.createQueryRunner).toHaveBeenCalledTimes(1);
    });

    it('retries on a transient deadlock error and eventually succeeds', async () => {
      const callback = jest
        .fn()
        .mockRejectedValueOnce(new Error('deadlock detected'))
        .mockResolvedValueOnce('recovered');

      const result = await service.executeWithRetry(callback, 3, undefined);

      expect(result).toBe('recovered');
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('retries on a serialization failure error code', async () => {
      const callback = jest
        .fn()
        .mockRejectedValueOnce(new Error('error 40001: serialization failure'))
        .mockResolvedValueOnce('recovered');

      const result = await service.executeWithRetry(callback, 3);

      expect(result).toBe('recovered');
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('does not retry a non-transient error and rejects immediately', async () => {
      const callback = jest
        .fn()
        .mockRejectedValue(new Error('validation failed'));

      await expect(service.executeWithRetry(callback, 3)).rejects.toThrow(
        'validation failed',
      );
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('gives up after exhausting all retry attempts on a transient error', async () => {
      const callback = jest
        .fn()
        .mockRejectedValue(new Error('deadlock detected'));

      await expect(service.executeWithRetry(callback, 2)).rejects.toThrow(
        'deadlock detected',
      );
      expect(callback).toHaveBeenCalledTimes(2);
    });

    it('defaults to 3 retry attempts when none is specified', async () => {
      const callback = jest
        .fn()
        .mockRejectedValue(new Error('deadlock detected'));

      await expect(service.executeWithRetry(callback)).rejects.toThrow(
        'deadlock detected',
      );
      expect(callback).toHaveBeenCalledTimes(3);
    });
  });
});
