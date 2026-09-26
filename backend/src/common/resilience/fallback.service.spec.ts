import { FallbackService } from './fallback.service';

describe('FallbackService', () => {
  let service: FallbackService;

  beforeEach(() => {
    service = new FallbackService();
    service.resetStats();
  });

  describe('execute', () => {
    it('returns the primary result when it succeeds', async () => {
      const primary = jest.fn().mockResolvedValue('live');
      const result = await service.execute(primary, {
        fallbackValue: 'cached',
      });
      expect(result).toBe('live');
      expect(service.getStats().totalFallbacks).toBe(0);
    });

    it('returns the static fallback value when the primary fails', async () => {
      const primary = jest.fn().mockRejectedValue(new Error('down'));
      const result = await service.execute(primary, {
        fallbackValue: 'cached',
      });
      expect(result).toBe('cached');
      expect(service.getStats().totalFallbacks).toBe(1);
    });

    it('invokes the fallback function with the original error', async () => {
      const error = new Error('boom');
      const primary = jest.fn().mockRejectedValue(error);
      const fallbackFn = jest.fn().mockResolvedValue('computed');

      const result = await service.execute(primary, { fallbackFn });
      expect(result).toBe('computed');
      expect(fallbackFn).toHaveBeenCalledWith(error);
    });

    it('prefers fallbackFn over fallbackValue when both are present', async () => {
      const primary = jest.fn().mockRejectedValue(new Error('x'));
      const result = await service.execute(primary, {
        fallbackFn: () => 'fn',
        fallbackValue: 'value',
      });
      expect(result).toBe('fn');
    });

    it('rethrows the original error when shouldFallback returns false', async () => {
      const primary = jest.fn().mockRejectedValue(new Error('fatal'));
      await expect(
        service.execute(primary, {
          fallbackValue: 'cached',
          shouldFallback: () => false,
        }),
      ).rejects.toThrow('fatal');
      expect(service.getStats().totalFallbacks).toBe(0);
    });

    it('rethrows when no fallback is configured', async () => {
      const primary = jest.fn().mockRejectedValue(new Error('nope'));
      await expect(service.execute(primary, {})).rejects.toThrow('nope');
    });

    it('treats an explicit undefined fallbackValue as a valid fallback', async () => {
      const primary = jest.fn().mockRejectedValue(new Error('down'));
      const result = await service.execute<string | undefined>(primary, {
        fallbackValue: undefined,
      });
      expect(result).toBeUndefined();
      expect(service.getStats().totalFallbacks).toBe(1);
    });

    it('propagates errors thrown by the fallback function', async () => {
      const primary = jest.fn().mockRejectedValue(new Error('primary'));
      const fallbackFn = jest.fn().mockRejectedValue(new Error('fallback-too'));
      await expect(service.execute(primary, { fallbackFn })).rejects.toThrow(
        'fallback-too',
      );
    });

    it('calls onFallback when the fallback path is taken', async () => {
      const onFallback = jest.fn();
      const primary = jest.fn().mockRejectedValue(new Error('down'));
      await service.execute(primary, { fallbackValue: 'cached', onFallback });
      expect(onFallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('wrap', () => {
    it('produces a fallback-protected function', async () => {
      const flaky = jest.fn().mockImplementation(async (n: number) => {
        if (n < 0) throw new Error('negative');
        return n * 2;
      });
      const safe = service.wrap(flaky, { fallbackValue: -1 });

      await expect(safe(5)).resolves.toBe(10);
      await expect(safe(-5)).resolves.toBe(-1);
    });
  });

  describe('stats', () => {
    it('tracks call and fallback counts and resets them', async () => {
      await service.execute(jest.fn().mockResolvedValue('ok'), {
        fallbackValue: 'x',
      });
      await service.execute(jest.fn().mockRejectedValue(new Error('e')), {
        fallbackValue: 'x',
      });

      let stats = service.getStats();
      expect(stats.totalCalls).toBe(2);
      expect(stats.totalFallbacks).toBe(1);

      service.resetStats();
      stats = service.getStats();
      expect(stats.totalCalls).toBe(0);
      expect(stats.totalFallbacks).toBe(0);
    });
  });
});
