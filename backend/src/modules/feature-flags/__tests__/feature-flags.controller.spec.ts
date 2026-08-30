import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { FeatureFlagsController } from '../feature-flags.controller';
import { FeatureFlagsService } from '../feature-flags.service';
import { AuditLogInterceptor } from '../../audit/interceptors/audit-log.interceptor';

describe('FeatureFlagsController', () => {
  let controller: FeatureFlagsController;
  let service: jest.Mocked<FeatureFlagsService>;

  beforeEach(async () => {
    const serviceMock = {
      isFeatureEnabled: jest.fn().mockResolvedValue(true),
      evaluateAllFlagsForUser: jest.fn().mockResolvedValue({
        test_flag: {
          enabled: true,
          rolloutPercentage: 100,
          isEnabledForUser: true,
        },
      }),
      getAllFlags: jest.fn().mockResolvedValue([]),
      getFlagByKey: jest.fn().mockResolvedValue({ key: 'test_flag' }),
      createFlag: jest.fn().mockResolvedValue({ key: 'new_flag' }),
      updateFlag: jest
        .fn()
        .mockResolvedValue({ key: 'test_flag', rolloutPercentage: 50 }),
      setRolloutPercentage: jest
        .fn()
        .mockResolvedValue({ key: 'test_flag', rolloutPercentage: 25 }),
      killSwitch: jest.fn().mockResolvedValue({
        key: 'test_flag',
        enabled: false,
        rolloutPercentage: 0,
      }),
      deleteFlag: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeatureFlagsController],
      providers: [
        {
          provide: FeatureFlagsService,
          useValue: serviceMock,
        },
      ],
    })
      .overrideInterceptor(AuditLogInterceptor)
      .useValue({
        intercept(_ctx: ExecutionContext, next: CallHandler) {
          return next.handle();
        },
      })
      .compile();

    controller = module.get<FeatureFlagsController>(FeatureFlagsController);
    service = module.get(FeatureFlagsService);
  });

  it('should evaluate a single feature flag', async () => {
    const res = await controller.evaluateFlag('test_flag', 'user-123');
    expect(res).toEqual({
      key: 'test_flag',
      userId: 'user-123',
      isEnabled: true,
    });
    expect(service.isFeatureEnabled).toHaveBeenCalledWith(
      'test_flag',
      'user-123',
    );
  });

  it('should evaluate all flags for user', async () => {
    const res = await controller.evaluateAllFlags('user-123');
    expect(res).toHaveProperty('test_flag');
    expect(service.evaluateAllFlagsForUser).toHaveBeenCalledWith('user-123');
  });

  it('should trigger kill switch on admin endpoint', async () => {
    const res = await controller.killSwitch('test_flag');
    expect(res.enabled).toBe(false);
    expect(service.killSwitch).toHaveBeenCalledWith('test_flag');
  });
});
