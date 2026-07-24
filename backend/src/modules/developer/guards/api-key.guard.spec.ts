import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeyGuard, API_KEY_HEADER } from './api-key.guard';
import { DeveloperService } from '../developer.service';
import { ApiKey } from '../entities/api-key.entity';

describe('ApiKeyGuard', () => {
  let guard: ApiKeyGuard;
  let developerService: jest.Mocked<DeveloperService>;
  let reflector: jest.Mocked<Reflector>;

  const mockDeveloperService = {
    validateKey: jest.fn(),
  };

  const mockReflector = {
    getAllAndOverride: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyGuard,
        {
          provide: DeveloperService,
          useValue: mockDeveloperService,
        },
        {
          provide: Reflector,
          useValue: mockReflector,
        },
      ],
    }).compile();

    guard = module.get<ApiKeyGuard>(ApiKeyGuard);
    developerService = module.get(DeveloperService);
    reflector = module.get(Reflector);

    jest.clearAllMocks();
  });

  function createMockExecutionContext(
    headers: Record<string, string>,
  ): ExecutionContext {
    const request = {
      headers,
      user: undefined,
    };
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
      }),
    } as unknown as ExecutionContext;
  }

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should allow public routes', async () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      const context = createMockExecutionContext({});

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalled();
      expect(developerService.validateKey).not.toHaveBeenCalled();
    });

    it('should return false if API key is missing', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockExecutionContext({});

      const result = await guard.canActivate(context);

      expect(result).toBe(false);
      expect(developerService.validateKey).not.toHaveBeenCalled();
    });

    it('should throw UnauthorizedException if API key is invalid', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockExecutionContext({
        [API_KEY_HEADER]: 'chioma_sk_invalidkey123',
      });
      developerService.validateKey.mockResolvedValue(null);

      await expect(guard.canActivate(context)).rejects.toThrow(
        UnauthorizedException,
      );
      expect(developerService.validateKey).toHaveBeenCalledWith(
        'chioma_sk_invalidkey123',
      );
    });

    it('should set user and return true if API key is valid', async () => {
      reflector.getAllAndOverride.mockReturnValue(false);
      const context = createMockExecutionContext({
        'x-api-key': 'chioma_sk_validkey123',
      });
      const mockKey = {
        id: 'key-id-123',
        userId: 'user-id-456',
      } as ApiKey;
      developerService.validateKey.mockResolvedValue(mockKey);

      const result = await guard.canActivate(context);

      expect(result).toBe(true);
      const request = context.switchToHttp().getRequest();
      expect(request.user).toEqual({
        id: 'user-id-456',
        apiKeyId: 'key-id-123',
      });
    });
  });
});
