import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HealthCheckError } from '@nestjs/terminus';
import { RedisHealthIndicator } from './redis.indicator';
import { REDIS_CLIENT } from '../../common/lock/redis-client.token';

describe('RedisHealthIndicator', () => {
  let indicator: RedisHealthIndicator;
  let mockConfigService: Partial<ConfigService>;
  let mockRedisClient: { ping: jest.Mock } | null;

  const buildModule = async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisHealthIndicator,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: REDIS_CLIENT, useValue: mockRedisClient },
      ],
    }).compile();

    return module.get<RedisHealthIndicator>(RedisHealthIndicator);
  };

  beforeEach(() => {
    mockRedisClient = { ping: jest.fn() };
  });

  describe('when using ioredis', () => {
    beforeEach(async () => {
      mockConfigService = { get: jest.fn().mockReturnValue(undefined) };
      indicator = await buildModule();
    });

    it('should be defined', () => {
      expect(indicator).toBeDefined();
    });

    it('should return up when PING succeeds', async () => {
      mockRedisClient!.ping.mockResolvedValue('PONG');

      const result = await indicator.isHealthy('redis');

      expect(result).toMatchObject({
        redis: {
          status: 'up',
          mode: 'ioredis',
          responseTime: expect.any(Number),
        },
      });
    });

    it('should throw HealthCheckError when PING fails', async () => {
      mockRedisClient!.ping.mockRejectedValue(new Error('ECONNREFUSED'));

      await expect(indicator.isHealthy('redis')).rejects.toThrow(
        HealthCheckError,
      );
    });
  });

  describe('when Redis is not configured', () => {
    beforeEach(async () => {
      mockConfigService = { get: jest.fn().mockReturnValue(undefined) };
      mockRedisClient = null;
      indicator = await buildModule();
    });

    it('should return a skipped status without throwing', async () => {
      const result = await indicator.isHealthy('redis');

      expect(result).toMatchObject({
        redis: { status: 'skipped' },
      });
    });
  });

  describe('when using Upstash REST API', () => {
    beforeEach(async () => {
      mockConfigService = {
        get: jest.fn((key: string, def?: unknown) => {
          if (key === 'REDIS_URL') return 'https://example.upstash.io';
          if (key === 'REDIS_TOKEN') return 'token';
          return def;
        }),
      };
      indicator = await buildModule();
    });

    it('should report the upstash mode', async () => {
      jest
        .spyOn(indicator as any, 'getClient')
        .mockReturnValue({ ping: jest.fn().mockResolvedValue('PONG') });

      const result = await indicator.isHealthy('redis');

      expect(result).toMatchObject({
        redis: { status: 'up', mode: 'upstash' },
      });
    });
  });
});
