import { Test, TestingModule } from '@nestjs/testing';
import { DatabasePerformanceController } from './database-performance.controller';
import { DatabasePerformanceService } from './database-performance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

describe('DatabasePerformanceController', () => {
  let controller: DatabasePerformanceController;
  let service: DatabasePerformanceService;

  beforeEach(async () => {
    const mockService = {
      getPerformanceReport: jest
        .fn()
        .mockResolvedValue({ generatedAt: '2023-01-01' }),
      getSlowQueries: jest.fn().mockResolvedValue([]),
      getIndexUsage: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [DatabasePerformanceController],
      providers: [
        {
          provide: DatabasePerformanceService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<DatabasePerformanceController>(
      DatabasePerformanceController,
    );
    service = module.get<DatabasePerformanceService>(
      DatabasePerformanceService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return performance report', async () => {
    const result = await controller.getPerformanceReport();
    expect(result).toEqual({ generatedAt: '2023-01-01' });
    expect(service.getPerformanceReport).toHaveBeenCalled();
  });

  it('should return slow queries', async () => {
    const result = await controller.getSlowQueries();
    expect(result).toEqual([]);
    expect(service.getSlowQueries).toHaveBeenCalledWith(20);
  });
});
