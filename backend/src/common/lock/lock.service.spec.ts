import { LockService } from './lock.service';
import { LockNotAcquiredError } from './lock.errors';
import { Logger } from '@nestjs/common';

describe('LockService', () => {
  let lockService: LockService;
  let mockRedis: any;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    mockRedis = {
      set: jest.fn(),
      eval: jest.fn(),
    };
    lockService = new LockService(mockRedis);
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  describe('acquireLock', () => {
    it('should acquire lock using Redis when available', async () => {
      mockRedis.set.mockResolvedValue('OK');
      const token = await lockService.acquireLock('resource', 1000);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(mockRedis.set).toHaveBeenCalledWith(
        'lock:resource',
        token,
        'PX',
        1000,
        'NX',
      );
    });

    it('should return null if Redis set returns null/undefined (lock already held)', async () => {
      mockRedis.set.mockResolvedValue(null);
      const token = await lockService.acquireLock('resource', 1000);
      expect(token).toBeNull();
    });

    it('should throw error if TTL exceeds MAX_TTL_MS', async () => {
      await expect(lockService.acquireLock('resource', 35000)).rejects.toThrow(
        'Lock TTL exceeds maximum allowed value of 30000ms',
      );
    });

    it('should fall back to local lock map if Redis client is null', async () => {
      const localService = new LockService(null);
      const token1 = await localService.acquireLock('resource', 1000);
      expect(token1).toBeDefined();
      expect(typeof token1).toBe('string');

      // Try acquiring again, should fail as it's already locked
      const token2 = await localService.acquireLock('resource', 1000);
      expect(token2).toBeNull();
    });
  });

  describe('releaseLock', () => {
    it('should release lock using Redis when available', async () => {
      mockRedis.eval.mockResolvedValue(1);
      const released = await lockService.releaseLock('resource', 'token-123');
      expect(released).toBe(true);
      expect(mockRedis.eval).toHaveBeenCalledWith(
        expect.any(String),
        1,
        'lock:resource',
        'token-123',
      );
    });

    it('should return false if Redis eval returns 0 (lock release failed or token mismatch)', async () => {
      mockRedis.eval.mockResolvedValue(0);
      const released = await lockService.releaseLock('resource', 'token-123');
      expect(released).toBe(false);
    });

    it('should release lock using local lock map when Redis is not available', async () => {
      const localService = new LockService(null);
      const token = await localService.acquireLock('resource', 1000);
      expect(token).not.toBeNull();

      const released = await localService.releaseLock('resource', token!);
      expect(released).toBe(true);

      // Re-release should fail
      const releasedAgain = await localService.releaseLock('resource', token!);
      expect(releasedAgain).toBe(false);
    });
  });

  describe('withLock', () => {
    it('should execute task and release lock successfully', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.eval.mockResolvedValue(1);

      const task = jest.fn().mockResolvedValue('task-result');
      const result = await lockService.withLock('resource', 1000, task);

      expect(result).toBe('task-result');
      expect(task).toHaveBeenCalled();
      expect(mockRedis.set).toHaveBeenCalled();
      expect(mockRedis.eval).toHaveBeenCalled();
    });

    it('should retry acquiring lock and succeed if subsequent attempts pass', async () => {
      mockRedis.set
        .mockResolvedValueOnce(null) // Fail 1st attempt
        .mockResolvedValueOnce(null) // Fail 2nd attempt
        .mockResolvedValueOnce('OK'); // Succeed 3rd attempt
      mockRedis.eval.mockResolvedValue(1);

      const task = jest.fn().mockResolvedValue('ok');

      const promise = lockService.withLock('resource', 1000, task, {
        retryCount: 3,
        retryDelayMs: 50,
      });

      // Let the retries happen by advancing timers
      await jest.runAllTimersAsync();

      const result = await promise;
      expect(result).toBe('ok');
      expect(task).toHaveBeenCalled();
      expect(mockRedis.set).toHaveBeenCalledTimes(3);
    });

    it('should throw LockNotAcquiredError if all attempts to acquire lock fail', async () => {
      mockRedis.set.mockResolvedValue(null); // Always fails

      const task = jest.fn().mockResolvedValue('ok');

      const promise = lockService.withLock('resource', 1000, task, {
        retryCount: 2,
        retryDelayMs: 50,
      });

      const assertion =
        expect(promise).rejects.toBeInstanceOf(LockNotAcquiredError);

      await jest.runAllTimersAsync();
      await assertion;

      expect(task).not.toHaveBeenCalled();
      expect(mockRedis.set).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
    });

    it('should log warning if lock expires before release', async () => {
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.eval.mockResolvedValue(0); // 0 means release failed (expired/token mismatch)

      const task = jest.fn().mockResolvedValue('ok');
      await lockService.withLock('resource', 1000, task);

      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Lock for key "resource" expired before explicit release',
        ),
      );
    });
  });
});
