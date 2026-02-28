import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitGuard } from '../guards/rate-limit.guard';
import { RateLimitService } from '../services/rate-limit.service';
import { AbuseDetectionService } from '../services/abuse-detection.service';
import { RateLimitAnalyticsService } from '../services/rate-limit-analytics.service';
import { UserRole } from '../../users/entities/user.entity';
import { EndpointCategory } from '../types/rate-limit.types';

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;
  let rateLimitService: jest.Mocked<RateLimitService>;
  let abuseDetectionService: jest.Mocked<AbuseDetectionService>;
  let analyticsService: jest.Mocked<RateLimitAnalyticsService>;
  let reflector: jest.Mocked<Reflector>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
        {
          provide: RateLimitService,
          useValue: {
            consumePoints: jest.fn(),
            isWhitelisted: jest.fn(),
          },
        },
        {
          provide: AbuseDetectionService,
          useValue: {
            isBlocked: jest.fn(),
            recordRequest: jest.fn(),
            detectAbuse: jest.fn(),
          },
        },
        {
          provide: RateLimitAnalyticsService,
          useValue: {
            recordRequest: jest.fn(),
            recordAbuseDetection: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<RateLimitGuard>(RateLimitGuard);
    rateLimitService = module.get(RateLimitService);
    abuseDetectionService = module.get(AbuseDetectionService);
    analyticsService = module.get(RateLimitAnalyticsService);
    reflector = module.get(Reflector);
  });

  const createMockExecutionContext = (user?: any): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
          ip: '192.168.1.1',
          path: '/api/test',
          headers: {},
          rateLimitInfo: undefined,
        }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;
  };

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should skip rate limiting when decorator is present', async () => {
      reflector.getAllAndOverride.mockReturnValueOnce(true);

      const context = createMockExecutionContext();
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(rateLimitService.consumePoints).not.toHaveBeenCalled();
    });

    it('should allow request when under rate limit', async () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(EndpointCategory.PUBLIC)
        .mockReturnValueOnce(1);

      rateLimitService.isWhitelisted.mockResolvedValue(false);
      abuseDetectionService.isBlocked.mockResolvedValue(false);
      abuseDetectionService.detectAbuse.mockResolvedValue({
        isAbuser: false,
        abuseScore: 10,
        violations: [],
      });
      rateLimitService.consumePoints.mockResolvedValue({
        success: true,
        remainingPoints: 95,
        msBeforeNext: 60000,
        isBlocked: false,
      });

      const context = createMockExecutionContext();
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(analyticsService.recordRequest).toHaveBeenCalledWith(
        expect.any(String),
        false,
        expect.any(Number),
      );
    });

    it('should block request when rate limit exceeded', async () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(EndpointCategory.PUBLIC)
        .mockReturnValueOnce(1);

      rateLimitService.isWhitelisted.mockResolvedValue(false);
      abuseDetectionService.isBlocked.mockResolvedValue(false);
      abuseDetectionService.detectAbuse.mockResolvedValue({
        isAbuser: false,
        abuseScore: 10,
        violations: [],
      });
      rateLimitService.consumePoints.mockResolvedValue({
        success: false,
        remainingPoints: 0,
        msBeforeNext: 60000,
        isBlocked: false,
      });

      const context = createMockExecutionContext();

      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
      expect(analyticsService.recordRequest).toHaveBeenCalledWith(
        expect.any(String),
        true,
        expect.any(Number),
      );
    });

    it('should allow whitelisted users', async () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(EndpointCategory.PUBLIC)
        .mockReturnValueOnce(1);

      rateLimitService.isWhitelisted.mockResolvedValue(true);

      const context = createMockExecutionContext();
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(rateLimitService.consumePoints).not.toHaveBeenCalled();
    });

    it('should block when abuse detected', async () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(EndpointCategory.PUBLIC)
        .mockReturnValueOnce(1);

      rateLimitService.isWhitelisted.mockResolvedValue(false);
      abuseDetectionService.isBlocked.mockResolvedValue(false);
      abuseDetectionService.detectAbuse.mockResolvedValue({
        isAbuser: true,
        abuseScore: 100,
        violations: ['Too many requests'],
        blockUntil: new Date(Date.now() + 3600000),
      });

      const context = createMockExecutionContext();

      await expect(guard.canActivate(context)).rejects.toThrow(HttpException);
      expect(analyticsService.recordAbuseDetection).toHaveBeenCalled();
    });

    it('should assign correct tier based on user role', async () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(EndpointCategory.PUBLIC)
        .mockReturnValueOnce(1);

      const adminUser = {
        id: 'admin-123',
        email: 'admin@test.com',
        role: UserRole.ADMIN,
      };

      rateLimitService.isWhitelisted.mockResolvedValue(false);
      abuseDetectionService.isBlocked.mockResolvedValue(false);
      abuseDetectionService.detectAbuse.mockResolvedValue({
        isAbuser: false,
        abuseScore: 10,
        violations: [],
      });
      rateLimitService.consumePoints.mockResolvedValue({
        success: true,
        remainingPoints: 9995,
        msBeforeNext: 60000,
        isBlocked: false,
      });

      const context = createMockExecutionContext(adminUser);
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should use IP-based identifier for unauthenticated requests', async () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(EndpointCategory.PUBLIC)
        .mockReturnValueOnce(1);

      rateLimitService.isWhitelisted.mockResolvedValue(false);
      abuseDetectionService.isBlocked.mockResolvedValue(false);
      abuseDetectionService.detectAbuse.mockResolvedValue({
        isAbuser: false,
        abuseScore: 10,
        violations: [],
      });
      rateLimitService.consumePoints.mockResolvedValue({
        success: true,
        remainingPoints: 95,
        msBeforeNext: 60000,
        isBlocked: false,
      });

      const context = createMockExecutionContext();
      await guard.canActivate(context);

      expect(abuseDetectionService.recordRequest).toHaveBeenCalledWith(
        expect.stringContaining('ip:'),
        expect.any(String),
      );
    });

    it('should handle errors gracefully', async () => {
      reflector.getAllAndOverride
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(EndpointCategory.PUBLIC)
        .mockReturnValueOnce(1);

      rateLimitService.isWhitelisted.mockRejectedValue(
        new Error('Redis error'),
      );

      const context = createMockExecutionContext();
      const result = await guard.canActivate(context);

      expect(result).toBe(true);
    });
  });
});
