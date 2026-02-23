import { Test, TestingModule } from '@nestjs/testing';
import { HealthCheckError } from '@nestjs/terminus';
import { MemoryHealthIndicator } from './memory.indicator';

// Mock process.memoryUsage at module level
const mockMemoryUsage = jest.fn();

describe('MemoryHealthIndicator', () => {
  let indicator: MemoryHealthIndicator;
  let memoryUsageSpy: jest.SpyInstance;

  beforeAll(() => {
    memoryUsageSpy = jest.spyOn(process, 'memoryUsage');
  });

  afterAll(() => {
    memoryUsageSpy.mockRestore();
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MemoryHealthIndicator],
    }).compile();

    indicator = module.get<MemoryHealthIndicator>(MemoryHealthIndicator);
    memoryUsageSpy.mockClear();
  });

  it('should be defined', () => {
    expect(indicator).toBeDefined();
  });

  describe('isHealthy', () => {
    it('should return healthy status when memory usage is normal', async () => {
      memoryUsageSpy.mockReturnValue({
        heapUsed: 100 * 1024 * 1024, // 100MB
        heapTotal: 200 * 1024 * 1024, // 200MB
        external: 10 * 1024 * 1024, // 10MB
        rss: 150 * 1024 * 1024, // 150MB
        arrayBuffers: 5 * 1024 * 1024, // 5MB
      });

      const result = await indicator.isHealthy('memory');

      expect(result).toMatchObject({
        memory: {
          status: 'up',
          responseTime: expect.any(Number),
          message: 'Memory usage is normal',
          heapUsed: '100.00 MB',
          heapTotal: '200.00 MB',
          heapUsagePercentage: 50,
          uptime: expect.any(Number),
          nodeVersion: expect.any(String),
          platform: expect.any(String),
          arch: expect.any(String),
          pid: expect.any(Number),
        },
      });
    });

    it('should return warning status when memory usage is elevated', async () => {
      memoryUsageSpy.mockReturnValue({
        heapUsed: 600 * 1024 * 1024, // 600MB (above warning threshold)
        heapTotal: 800 * 1024 * 1024, // 800MB
        external: 10 * 1024 * 1024,
        rss: 700 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024,
      });

      const result = await indicator.isHealthy('memory');

      expect(result.memory.status).toBe('warning');
      expect(result.memory.message).toBe('Memory usage is elevated');
    });

    it('should throw HealthCheckError when memory usage is critical', async () => {
      memoryUsageSpy.mockReturnValue({
        heapUsed: 1200 * 1024 * 1024, // 1200MB (above error threshold)
        heapTotal: 1500 * 1024 * 1024, // 1500MB
        external: 10 * 1024 * 1024,
        rss: 1300 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024,
      });

      await expect(indicator.isHealthy('memory')).rejects.toThrow(
        HealthCheckError,
      );
    });

    it('should handle process.memoryUsage errors', async () => {
      memoryUsageSpy.mockImplementation(() => {
        throw new Error('Memory usage error');
      });

      await expect(indicator.isHealthy('memory')).rejects.toThrow(
        HealthCheckError,
      );
    });
  });

  describe('getMemoryThresholds', () => {
    it('should return memory thresholds', () => {
      const thresholds = indicator.getMemoryThresholds();

      expect(thresholds).toMatchObject({
        warning: expect.any(String),
        error: expect.any(String),
        warningBytes: expect.any(Number),
        errorBytes: expect.any(Number),
      });
    });
  });
});
